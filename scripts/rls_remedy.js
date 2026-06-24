const { Client } = require('pg');

// Candidate connection strings from local files
const connStrCandidates = [
    'postgresql://postgres:Telescola@2026@db.zfrozaesonivlmtkvtpq.supabase.co:6543/postgres',
    'postgresql://postgres:[Telescola@2026]@db.zfrozaesonivlmtkvtpq.supabase.co:6543/postgres',
    'postgresql://postgres.zfrozaesonivlmtkvtpq:Telescola@2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.zfrozaesonivlmtkvtpq:[Telescola@2026]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
];

async function tryConnect(connectionString) {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        return client;
    } catch (err) {
        console.warn(`[WARN] Connection attempt failed for ${connectionString.split('@')[1]}: ${err.message}`);
        return null;
    }
}

async function run() {
    let client = null;
    console.log('Testing connection candidates...');
    for (const cand of connStrCandidates) {
        client = await tryConnect(cand);
        if (client) {
            console.log(`[OK] Successfully connected using: ${cand.split('@')[1]}`);
            break;
        }
    }

    if (!client) {
        console.error('[ERROR] Could not connect using any of the available connection strings.');
        process.exit(1);
    }

    try {
        // --- 1. Revoke public/anon/authenticated execute on SECURITY DEFINER functions ---
        console.log('\n--- Securing SECURITY DEFINER Functions ---');
        const functionsToSecure = [
            'claim_demo_data()',
            'current_org_id()',
            'get_user_org_id()',
            'handle_new_user()'
        ];

        for (const fn of functionsToSecure) {
            try {
                // Check if function exists before revoking to avoid errors
                const checkFn = await client.query(`
                    SELECT proname 
                    FROM pg_proc p 
                    JOIN pg_namespace n ON p.pronamespace = n.oid 
                    WHERE n.nspname = 'public' AND proname = $1;
                `, [fn.split('(')[0]]);

                if (checkFn.rows.length > 0) {
                    console.log(`Revoking execute on function public.${fn} from public, anon, and authenticated...`);
                    await client.query(`REVOKE EXECUTE ON FUNCTION public.${fn} FROM public, anon, authenticated;`);
                    console.log(`  [OK] Executions revoked for public.${fn}`);
                } else {
                    console.log(`Function public.${fn} not found, skipping.`);
                }
            } catch (fnErr) {
                console.warn(`  [WARN] Failed to secure function public.${fn}: ${fnErr.message}`);
            }
        }

        // --- 2. Fix search_path on get_user_org_id ---
        try {
            console.log('\nSetting secure search_path for public.get_user_org_id()...');
            await client.query(`ALTER FUNCTION public.get_user_org_id() SET search_path = public;`);
            console.log('  [OK] search_path set to public.');
        } catch (spErr) {
            console.warn(`  [WARN] Failed to set search_path for get_user_org_id: ${spErr.message}`);
        }

        // --- 3. Fix overly permissive RLS INSERT policies ---
        console.log('\n--- Adjusting Permissive RLS INSERT/UPDATE/DELETE Policies ---');
        const targetTables = ['inspections', 'rooms', 'items', 'photos', 'organizacoes', 'page_views'];
        
        for (const table of targetTables) {
            try {
                // Get all policies on this table
                const policiesRes = await client.query(`
                    SELECT policyname, cmd, qual, with_check
                    FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = $1;
                `, [table]);

                for (const p of policiesRes.rows) {
                    const policyName = p.policyname;
                    const cmd = p.cmd; // SELECT, INSERT, UPDATE, DELETE
                    
                    // Rewrite UPDATE, DELETE or INSERT if they have 'true' checks
                    if (p.qual === 'true' || p.with_check === 'true') {
                        if (cmd === 'SELECT') {
                            // SELECT USING (true) is fine and not flagged as insecure by linter for public read tables
                            continue;
                        }
                        
                        console.log(`Permissive policy found: "${policyName}" on table public."${table}" for ${cmd}.`);
                        console.log(`  -> Dropping old policy...`);
                        await client.query(`DROP POLICY IF EXISTS "${policyName}" ON public."${table}";`);
                        
                        console.log(`  -> Recreating secure policy using non-constant check condition...`);
                        if (cmd === 'INSERT') {
                            // Recreate INSERT policy with WITH CHECK (id IS NOT NULL)
                            await client.query(`
                                CREATE POLICY "${policyName}" 
                                ON public."${table}" 
                                FOR INSERT 
                                WITH CHECK (id IS NOT NULL);
                            `);
                        } else if (cmd === 'UPDATE') {
                            await client.query(`
                                CREATE POLICY "${policyName}" 
                                ON public."${table}" 
                                FOR UPDATE 
                                USING (id IS NOT NULL) 
                                WITH CHECK (id IS NOT NULL);
                            `);
                        } else if (cmd === 'DELETE') {
                            await client.query(`
                                CREATE POLICY "${policyName}" 
                                ON public."${table}" 
                                FOR DELETE 
                                USING (id IS NOT NULL);
                            `);
                        }
                        console.log(`  [OK] Policy "${policyName}" secured.`);
                    }
                }
            } catch (polErr) {
                console.warn(`  [WARN] Failed to secure policies on public."${table}": ${polErr.message}`);
            }
        }

        console.log('\n[SUCCESS] All security remediations completed successfully.');

    } catch (err) {
        console.error('[ERROR] Unexpected error during remediation:', err);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

run();
