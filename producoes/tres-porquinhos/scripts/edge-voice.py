"""edge-tts com confiança TLS do sistema, mantendo verificação de certificados."""
import importlib
import os
from pathlib import Path
import runpy
import ssl
import sys

# edge-tts usa certifi; acrescentamos as CAs confiáveis do sistema e,
# quando explicitamente configurado, o bundle do proxy corporativo.
paths = [ssl.get_default_verify_paths().cafile, os.environ.get('POPUP_TTS_CA_FILE')]
for module_name in ('edge_tts.voices', 'edge_tts.communicate'):
    context = importlib.import_module(module_name)._SSL_CTX
    for path in paths:
        if path and Path(path).is_file():
            context.load_verify_locations(cafile=path)
# aiohttp não seleciona HTTPS_PROXY automaticamente para URLs wss://.
# Mantemos o caminho de rede autorizado também para a síntese WebSocket.
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
if proxy and '--proxy' not in sys.argv:
    sys.argv.extend(['--proxy', proxy])
runpy.run_module('edge_tts', run_name='__main__')
