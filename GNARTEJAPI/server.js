<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GNARTEJ AI</title>
    <style>
        /* --- VARIABLES PARA LOS TEMAS (CLARO Y OSCURO) --- */
        :root {
            --bg-principal: #0f0f11;
            --bg-chat: #141417;
            --bg-cabecera: #1a1a1f;
            --bg-tarjeta: #141417;
            --bg-item: #141417;
            --bg-item-hover: #1a1a1f;
            --texto-principal: #f1f1f3;
            --texto-secundario: #a1a1aa;
            --borde: #26262f;
            --borde-fuerte: #2e2e38;
            --verde-fosforito: #00ff99;
            --ai-msg-bg: #1a1a1f;
            --ai-msg-texto: #e4e4e7;
            --bg-modal-overlay: rgba(15, 15, 17, 0.96);
            --bg-modal-alerta: rgba(9, 9, 11, 0.9);
        }

        /* Cuando se activa el modo claro */
        [data-theme="claro"] {
            --bg-principal: #f4f4f5;
            --bg-chat: #ffffff;
            --bg-cabecera: #e4e4e7;
            --bg-tarjeta: #ffffff;
            --bg-item: #fafafa;
            --bg-item-hover: #f4f4f5;
            --texto-principal: #09090b;
            --texto-secundario: #71717a;
            --borde: #e4e4e7;
            --borde-fuerte: #d4d4d8;
            --ai-msg-bg: #f4f4f5;
            --ai-msg-texto: #09090b;
            --bg-modal-overlay: rgba(244, 244, 245, 0.96);
            --bg-modal-alerta: rgba(228, 228, 231, 0.9);
        }

        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
            transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        html, body {
            background-color: var(--bg-principal);
            color: var(--texto-principal);
            height: 100vh;
            width: 100%;
            overflow: hidden;
        }

        #loading-screen {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: #0f0f11;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 24px;
            transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .spinner {
            width: 56px; height: 56px;
            border: 4px solid #1f1f24;
            border-top: 4px solid var(--verde-fosforito);
            border-radius: 50%;
            animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            box-shadow: 0 0 15px rgba(0, 255, 153, 0.2);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .app-container { 
            display: flex; 
            width: 100%; 
            height: 100vh; 
            overflow: hidden; 
        }

        .chat-area { 
            flex: 1; 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            background-color: var(--bg-chat); 
            overflow: hidden; 
            position: relative; 
        }

        .chat-header { 
            background-color: var(--bg-cabecera); 
            padding: 0 24px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid var(--borde); 
            height: 65px; 
            flex-shrink: 0; 
        }

        .chat-header h2 { 
            color: var(--verde-fosforito); 
            font-size: 19px; 
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .header-buttons-container { 
            display: flex; 
            gap: 12px; 
            align-items: center; 
        }

        .chat-status-badge { 
            background-color: var(--bg-principal); 
            color: var(--texto-principal);
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 13px; 
            font-weight: 600; 
            cursor: pointer; 
            border: 1px solid var(--borde-fuerte); 
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .chat-status-badge:hover { 
            background-color: var(--bg-item-hover); 
            border-color: var(--verde-fosforito);
        }

        /* Corrección del botón historial para que use los fondos limpios del tema */
        .btn-historial-header { 
            background-color: var(--bg-principal); 
            color: var(--verde-fosforito); 
            border: 1px solid var(--borde-fuerte); 
        }

        .btn-historial-header:hover { 
            background-color: var(--bg-item-hover); 
            border-color: var(--verde-fosforito);
        }

        .chat-messages { 
            flex: 1; 
            padding: 24px; 
            overflow-y: auto; 
            display: flex; 
            flex-direction: column; 
            gap: 16px; 
            width: 100%; 
            max-width: 100%; 
            -webkit-overflow-scrolling: touch; 
        }

        .message { 
            padding: 14px 18px; 
            border-radius: 16px; 
            max-width: 75%; 
            word-wrap: break-word; 
            overflow-wrap: break-word; 
            white-space: pre-wrap; 
            line-height: 1.5; 
            font-size: 15px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: messageFadeIn 0.3s ease;
        }

        @keyframes messageFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .user-message { 
            background-color: var(--verde-fosforito); 
            color: #000000 !important; 
            align-self: flex-end; 
            border-bottom-right-radius: 4px; 
            font-weight: 500;
        }

        .ai-message { 
            background-color: var(--ai-msg-bg); 
            color: var(--ai-msg-texto); 
            align-self: flex-start; 
            border-bottom-left-radius: 4px; 
            border: 1px solid var(--borde);
        }

        .ai-message a { 
            color: var(--verde-fosforito); 
            text-decoration: none; 
            font-weight: 600; 
            border-bottom: 1px dashed var(--verde-fosforito);
        }
        .ai-message a:hover {
            border-bottom-style: solid;
        }

        .chat-input-container { 
            padding: 16px 24px; 
            background-color: var(--bg-cabecera); 
            display: flex; 
            gap: 12px; 
            border-top: 1px solid var(--borde); 
            width: 100%; 
            flex-shrink: 0; 
        }

        .chat-input-container input { 
            flex: 1; 
            padding: 14px 18px; 
            border-radius: 12px; 
            border: 1px solid var(--borde); 
            background-color: var(--bg-chat); 
            color: var(--texto-principal); 
            font-size: 15px; 
            outline: none; 
        }

        .chat-input-container input:focus { 
            border-color: var(--verde-fosforito); 
        }

        .chat-input-container button { 
            background-color: var(--verde-fosforito); 
            color: #09090b; 
            border: none; 
            padding: 0 24px; 
            border-radius: 12px; 
            font-weight: 600; 
            cursor: pointer; 
            font-size: 15px; 
        }
        
        .chat-input-container button:hover:not(:disabled) {
            background-color: #00e680;
        }

        .chat-input-container input:disabled, .chat-input-container button:disabled { 
            opacity: 0.4; 
            cursor: not-allowed; 
        }

        .sidebar-right { 
            width: 300px; 
            background-color: var(--bg-principal); 
            border-left: 1px solid var(--borde); 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            flex-shrink: 0; 
        }

        .sidebar-header { 
            padding: 16px; 
            border-bottom: 1px solid var(--borde); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            gap: 8px; 
        }

        .btn-nuevo-chat { 
            width: 100%; 
            padding: 12px; 
            background-color: transparent; 
            color: var(--verde-fosforito); 
            border: 1px dashed rgba(0, 255, 153, 0.4); 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 14px; 
            text-align: center; 
        }

        .btn-nuevo-chat:hover:not(:disabled) {
            background-color: rgba(0, 255, 153, 0.05);
            border-style: solid;
            border-color: var(--verde-fosforito);
        }

        .btn-nuevo-chat:disabled { 
            opacity: 0.2; 
            cursor: not-allowed; 
        }

        .chats-list { 
            flex: 1; 
            overflow-y: auto; 
            padding: 12px; 
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
        }

        .chat-item { 
            padding: 12px 14px; 
            background-color: var(--bg-item); 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 14px; 
            border: 1px solid var(--borde); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            gap: 10px; 
        }

        .chat-item:hover, .chat-item.active { 
            background-color: var(--bg-item-hover); 
            border-color: var(--verde-fosforito); 
        }

        .chat-item-text { 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            flex: 1; 
            color: var(--texto-principal);
        }

        .btn-delete-chat { 
            background: none; 
            border: none; 
            color: var(--texto-secundario); 
            cursor: pointer; 
            font-size: 14px; 
            padding: 4px 6px; 
            border-radius: 6px; 
        }

        .btn-delete-chat:hover { 
            color: #ff4d4d; 
            background-color: rgba(255, 77, 77, 0.1); 
        }

        .sidebar-login-prompt { 
            padding: 24px; 
            text-align: center; 
            display: flex; 
            flex-direction: column; 
            gap: 12px; 
            justify-content: center; 
            height: 100%; 
            color: var(--texto-secundario); 
            font-size: 14px; 
        }

        /* El fondo ahora usa la variable reactiva al tema claro/oscuro */
        .modal-screen { 
            display: none; 
            position: absolute; 
            top: 0; left: 0; 
            width: 100%; height: 100%; 
            background-color: var(--bg-modal-overlay); 
            z-index: 999; 
            padding: 20px; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            backdrop-filter: blur(4px);
        }

        .account-card { 
            background-color: var(--bg-tarjeta); 
            border: 1px solid var(--borde); 
            border-radius: 16px; 
            width: 100%; 
            max-width: 420px; 
            padding: 32px; 
            display: flex; 
            flex-direction: column; 
            gap: 20px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .login-box-inside { 
            background: var(--bg-principal); 
            padding: 20px; 
            border-radius: 12px; 
            border: 1px solid var(--borde); 
        }

        .login-box-inside label { 
            font-size: 13px; 
            color: var(--texto-secundario); 
            display: block; 
            margin-top: 8px; 
            margin-bottom: 4px;
            font-weight: 500;
        }

        .login-box-inside input { 
            width: 100%; 
            padding: 12px; 
            margin-bottom: 12px; 
            background: var(--bg-chat); 
            border: 1px solid var(--borde); 
            color: var(--texto-principal); 
            border-radius: 8px; 
            font-size: 15px; 
            outline: none; 
        }

        .login-box-inside input:focus { 
            border-color: var(--verde-fosforito); 
        }

        .login-box-inside button { 
            width: 100%; 
            padding: 14px; 
            background: var(--verde-fosforito); 
            color: #09090b; 
            border: none; 
            font-weight: 600; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 15px; 
        }
        .login-box-inside button:hover {
            background-color: #00e680;
        }

        .zona-usuario-activa { 
            text-align: center; 
            padding: 10px; 
        }

        .btn-logout-panel { 
            width: 100%; 
            padding: 14px; 
            background-color: #ff4d4d; 
            color: white; 
            border: none; 
            font-weight: 600; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 15px; 
            margin-top: 12px; 
        }
        .btn-logout-panel:hover {
            background-color: #ff3333;
        }

        .btn-volver { 
            align-self: center; 
            background: none; 
            border: 1px solid var(--borde); 
            color: var(--texto-secundario); 
            padding: 10px 20px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 14px; 
        }
        .btn-volver:hover {
            background-color: var(--bg-item-hover);
            color: var(--texto-principal);
        }

        .modal-chats-list { 
            width: 100%; 
            max-height: 250px; 
            overflow-y: auto; 
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
            margin-top: 12px; 
        }

        @media (max-width: 768px) { 
            .sidebar-right { display: none; } 
        }

        /* El fondo de confirmación de borrado también cambia con el tema */
        .modal-alerta-oculto {
            display: none;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: var(--bg-modal-alerta);
            z-index: 2000;
            justify-content: center; align-items: center;
            padding: 20px;
            backdrop-filter: blur(4px);
        }

        .alerta-card { 
            background-color: var(--bg-tarjeta); 
            border: 1px solid #ff4d4d; 
            border-radius: 16px; 
            width: 100%; 
            max-width: 380px; 
            padding: 28px; 
            text-align: center; 
        }

        .alerta-card h3 { 
            color: #ff4d4d; 
            font-size: 20px; 
            margin-bottom: 12px; 
            font-weight: 600;
        }

        .alerta-card p { 
            color: var(--texto-secundario); 
            font-size: 14px; 
            line-height: 1.5; 
            margin-bottom: 24px; 
        }

        .alerta-botones { 
            display: flex; 
            gap: 12px; 
            justify-content: center; 
        }

        .btn-alerta-cancelar { 
            background-color: var(--bg-principal); 
            color: var(--texto-principal); 
            border: 1px solid var(--borde-fuerte); 
            padding: 12px 20px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 14px; 
        }

        .btn-alerta-eliminar { 
            background-color: #ff4d4d; 
            color: #fff; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 14px; 
        }

        .password-container { 
            position: relative; 
            width: 100%; 
            display: block; 
        }

        .password-container input { 
            padding-right: 46px !important; 
            width: 100%; 
        }

        .btn-toggle-password { 
            position: absolute !important; 
            right: 14px !important; 
            top: 40% !important; 
            transform: translateY(-50%) !important; 
            background: transparent !important; 
            border: none !important; 
            cursor: pointer !important; 
            font-size: 16px !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            width: auto !important; 
            height: auto !important; 
            z-index: 10 !important; 
        }

        .settings-group { display: flex; flex-direction: column; gap: 10px; margin-top: 5px; }
        .settings-group h4 { font-size: 14px; color: var(--texto-principal); font-weight: 600; }
        
        .capsule-selector { 
            display: flex; 
            background-color: var(--bg-principal); 
            border: 1px solid var(--borde); 
            border-radius: 50px; 
            padding: 3px; 
            width: 100%; 
        }
        
        .capsule-btn { 
            flex: 1; 
            background: none; 
            border: none; 
            padding: 10px; 
            font-size: 13px; 
            font-weight: bold; 
            cursor: pointer; 
            border-radius: 50px; 
            text-align: center; 
            color: var(--texto-secundario); 
        }
        
        .capsule-btn.active { 
            background-color: var(--verde-fosforito) !important; 
            color: #000000 !important; 
        }
    </style>
</head>
<body>

<div id="loading-screen">
    <div class="spinner"></div>
    <h2 style="color: var(--verde-fosforito); font-size: 16px; font-weight: 500; text-align: center; padding: 0 20px; letter-spacing: 0.3px;" id="loading-text">Conectando con GNARTEJ API... Verificando estado</h2>
</div>

<div id="account-screen" class="modal-screen">
    <div class="account-card">
        <div id="zona-login-registro">
            <h2 style="color: var(--verde-fosforito); font-size: 22px; text-align: center; margin-bottom: 6px; font-weight: 600;">Vincular Cuenta</h2>
            <p style="color: var(--texto-secundario); font-size: 14px; text-align: center; margin-bottom: 20px; line-height: 1.4;">Pon tu usuario y clave. Si no existes, nos encargamos de registrarte.</p>
            <div class="login-box-inside">
                <label>Usuario:</label>
                <input type="text" id="username-input" placeholder="Tu usuario...">
                <label>Contraseña:</label>
                <div class="password-container">
                    <input type="password" id="password-input" placeholder="Tu contraseña...">
                    <button type="button" class="btn-toggle-password" onclick="alternarVisibilidadPassword()">🙈</button>
                </div>
                <button id="btn-login-action" onclick="conectarCuentaNube()">Autenticar Cuenta</button>
            </div>
        </div>

        <div id="zona-logout" style="display: none;" class="zona-usuario-activa">
            <h2 style="color: var(--verde-fosforito); font-size: 22px; margin-bottom: 16px; font-weight: 600;" id="menu-user-title">Usuario</h2>
            <button class="btn-logout-panel" onclick="cerrarSesionNube()">Cerrar Sesión</button>
        </div>
        <button class="btn-volver" onclick="cerrarPantallaCuenta()">Cerrar Ventana</button>
    </div>
</div>

<div id="settings-screen" class="modal-screen">
    <div class="account-card">
        <h2 style="color: var(--verde-fosforito); font-size: 20px; text-align: center; font-weight: 600;">⚙️ Ajustes del Sistema</h2>
        <p style="color: var(--texto-secundario); font-size: 13px; text-align: center; margin-bottom: 15px;">Personaliza el entorno visual.</p>
        
        <div class="settings-group">
            <h4>Tema de la interfaz:</h4>
            <div class="capsule-selector">
                <button id="btn-theme-oscuro" class="capsule-btn active" onclick="definirTemaSistema('oscuro')">Oscuro</button>
                <button id="btn-theme-dispositivo" class="capsule-btn" onclick="definirTemaSistema('dispositivo')">Dispositivo</button>
                <button id="btn-theme-claro" class="capsule-btn" onclick="definirTemaSistema('claro')">Claro</button>
            </div>
        </div>
        <button class="btn-volver" onclick="cerrarPantallaSettings()" style="margin-top: 15px;">Cerrar Ajustes</button>
    </div>
</div>

<div class="app-container">
    <div class="chat-area">
        <div class="chat-header">
            <h2>GNARTEJ AI</h2>
            <div class="header-buttons-container">
                <div class="chat-status-badge btn-historial-header" id="btn-historial-top" onclick="abrirPantallaHistorial()" style="display: none;">💬 Historial</div>
                <div class="chat-status-badge" id="btn-settings-top" onclick="abrirPantallaSettings()">⚙️ Ajustes</div>
                <div class="chat-status-badge" id="status-badge" onclick="abrirPantallaCuenta()" style="color: #ff4d4d; border-color: #ff4d4d;">🔒 Conectar Cuenta</div>
            </div>
        </div>

        <div class="chat-messages" id="chat-box"></div>

        <div class="chat-input-container">
            <input type="text" id="user-input" placeholder="Requiere cuenta activa..." disabled>
            <button id="send-btn" onclick="enviarMensaje()" disabled>Enviar</button>
        </div>
    </div>

    <div class="sidebar-right" id="sidebar-conversaciones">
        <div class="sidebar-header">
            <button class="btn-nuevo-chat" id="sidebar-newchat-btn" onclick="crearNuevoChat()" disabled>+ Nuevo Chat</button>
        </div>
        <div class="chats-list" id="lista-chats"></div>
    </div>
</div>

<div id="history-screen" class="modal-screen">
    <div class="account-card" style="max-width: 460px;">
        <h2 style="color: var(--verde-fosforito); font-size: 20px; text-align: center; font-weight: 600;">🗂️ Historial de Conversaciones</h2>
        <button class="btn-nuevo-chat" id="modal-newchat-btn" onclick="crearNuevoChat(); cerrarPantallaHistorial();" style="margin-top: 8px;">+ Crear Nuevo Chat</button>
        <div class="modal-chats-list" id="lista-chats-modal"></div>
        <button class="btn-volver" onclick="cerrarPantallaHistorial()">Volver al Chat</button>
    </div>
</div>

<div id="modal-confirmacion" class="modal-alerta-oculto">
    <div class="alerta-card">
        <h3>¿Estás completamente seguro?</h3>
        <p>Si eliminas esta conversación, se borrará para siempre de la base de datos y no podrás recuperar tus mensajes.</p>
        <div class="alerta-botones">
            <button class="btn-alerta-cancelar" id="btn-cancelar-borrar">Cancelar</button>
            <button class="btn-alerta-eliminar" id="btn-confirmar-borrar">Sí, eliminar</button>
        </div>
    </div>
</div>

<script>
    const RENDER_BACKEND_URL = "https://gnartej-api-production.up.railway.app".replace(/\/$/, "");
    let usuarioNube = null;
    let chatActualId = null;
    let estaPensando = false;
    let chatParaBorrarId = null;
    let temaSeleccionado = "oscuro";

    const modal = document.getElementById('modal-confirmacion');
    const btnCancelar = document.getElementById('btn-cancelar-borrar');
    const btnConfirmar = document.getElementById('btn-confirmar-borrar');

    function guardarDato(key, valor) { try { localStorage.setItem(key, valor); } catch(e) { window.name = valor; } }
    function leerDato(key) { try { return localStorage.getItem(key); } catch(e) { return window.name || null; } }
    function borrarDato(key) { try { localStorage.removeItem(key); } catch(e) { window.name = ""; } }

    function formatearTextoConEnlaces(texto) {
        if (!texto) return "";
        const regexUrl = /(https?:\/\/[^\s]+)/g;
        return texto.replace(regexUrl, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    window.onload = async function() {
        document.getElementById("user-input").addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !this.disabled) {
                enviarMensaje();
            }
        });

        const temaGuardado = leerDato("gnartej_setting_tema");
        if (temaGuardado) definirTemaSistema(temaGuardado);

        await comprobarServidorRender();
        let sesionGuardada = leerDato("gnartej_user_session");
        let ultimoChatId = leerDato("gnartej_chat_actual_id");

        if (sesionGuardada) {
            try {
                usuarioNube = JSON.parse(sesionGuardada);
                chatActualId = ultimoChatId;
                activarInterfazNube();
                cargarHistorialNube();
                return;
            } catch(e) {}
        }
        activarInterfazDesconectado();

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (temaSeleccionado === "dispositivo") sincronizarConDispositivo();
        });
    }

    /* --- CORRECCIÓN DE LA LOGICA DE TRANSMISIÓN DE TEMAS --- */
    function definirTemaSistema(tema) {
        temaSeleccionado = tema;
        guardarDato("gnartej_setting_tema", tema);
        
        document.getElementById("btn-theme-oscuro").classList.remove("active");
        document.getElementById("btn-theme-dispositivo").classList.remove("active");
        document.getElementById("btn-theme-claro").classList.remove("active");
        
        if (tema === "oscuro") {
            document.getElementById("btn-theme-oscuro").classList.add("active");
            document.documentElement.removeAttribute("data-theme");
        } else if (tema === "claro") {
            document.getElementById("btn-theme-claro").classList.add("active");
            document.documentElement.setAttribute("data-theme", "claro");
        } else {
            document.getElementById("btn-theme-dispositivo").classList.add("active");
            sincronizarConDispositivo();
        }
    }

    function sincronizarConDispositivo() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", "claro");
        }
    }

    async function comprobarServidorRender() {
        const loadingText = document.getElementById("loading-text");
        let intentos = 0;
        loadingText.textContent = "Conectando con GNARTEJ API... Verificando estado";
        while(true) {
            try {
                const res = await fetch(`${RENDER_BACKEND_URL}/`);
                if(res.ok || res.status === 404 || res.status === 200) {
                    break;
                }
            } catch(e) {
                intentos++;
                if(intentos >= 1) {
                    loadingText.textContent = "El servidor de Railway se está iniciando... (Puede tardar unos segundos)";
                }
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        const loader = document.getElementById("loading-screen");
        loader.style.opacity = "0";
        setTimeout(() => { loader.style.display = "none"; }, 500);
    }

    function activarInterfazDesconectado() {
        usuarioNube = null; chatActualId = null;
        borrarDato("gnartej_user_session");
        borrarDato("gnartej_chat_actual_id");
        document.getElementById("status-badge").textContent = "🔒 Conectar Cuenta";
        document.getElementById("status-badge").style.color = "#ff4d4d";
        document.getElementById("status-badge").style.borderColor = "#ff4d4d";
        document.getElementById("btn-historial-top").style.display = "none";
        document.getElementById("user-input").disabled = true;
        document.getElementById("user-input").placeholder = "Por favor, inicia sesión para chatear...";
        document.getElementById("send-btn").disabled = true;
        document.getElementById("sidebar-newchat-btn").disabled = true;
        document.getElementById("zona-login-registro").style.display = "block";
        document.getElementById("zona-logout").style.display = "none";
        document.getElementById("chat-box").innerHTML = `<div class="message ai-message">¡Hola! Inicia sesión pulsando arriba en <strong>"🔒 Conectar Cuenta"</strong>.</div>`;
        document.getElementById("lista-chats").innerHTML = `<div class="sidebar-login-prompt"><p>Inicia sesión para ver tus conversaciones.</p></div>`;
        const contenedorModal = document.getElementById("lista-chats-modal");
        if(contenedorModal) contenedorModal.innerHTML = "";
    }

    function activarInterfazNube() {
        document.getElementById("status-badge").textContent = "👤 " + (usuarioNube.name || usuarioNube.username);
        document.getElementById("status-badge").style.color = "var(--verde-fosforito)";
        document.getElementById("status-badge").style.borderColor = "var(--verde-fosforito)";
        document.getElementById("btn-historial-top").style.display = "block";
        document.getElementById("menu-user-title").textContent = "👤 " + (usuarioNube.name || usuarioNube.username);
        document.getElementById("user-input").disabled = false;
        document.getElementById("user-input").placeholder = "Escribe un mensaje a GNARTEJ AI...";
        document.getElementById("send-btn").disabled = false;
        document.getElementById("sidebar-newchat-btn").disabled = false;
        document.getElementById("zona-login-registro").style.display = "none";
        document.getElementById("zona-logout").style.display = "block";
    }

    async function conectarCuentaNube() {
        const userField = document.getElementById("username-input");
        const passField = document.getElementById("password-input");
        if (!userField || !passField) {
            alert("Error: No se encuentran los inputs en el HTML.");
            return;
        }
        const username = userField.value.trim();
        const password = passField.value.trim();
        if(!username || !password) {
            alert("Por favor, rellena el usuario y la contraseña.");
            return;
        }
        const boton = document.getElementById("btn-login-action");
        boton.textContent = "Conectando...";
        boton.disabled = true;
        try {
            const urlLogin = `${RENDER_BACKEND_URL}/api/auth/login`;
            let res = await fetch(urlLogin, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            if (res.status === 404 || res.status === 400) {
                const urlRegistro = `${RENDER_BACKEND_URL}/api/auth/register`;
                const resRegistro = await fetch(urlRegistro, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, password: password, name: username })
                });
                if (resRegistro.ok) {
                    res = await fetch(urlLogin, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: username, password: password })
                    });
                } else {
                    const errData = await resRegistro.json().catch(() => ({}));
                    throw new Error(errData.error || `Error en el registro del backend (${resRegistro.status})`);
                }
            }
            if (!res.ok) {
                const errorBackend = await res.json().catch(() => ({}));
                throw new Error(errorBackend.error || `Error de credenciales o autenticación (${res.status})`);
            }
            usuarioNube = await res.json();
            guardarDato("gnartej_user_session", JSON.stringify(usuarioNube));
            activarInterfazNube();
            cerrarPantallaCuenta();
            setTimeout(() => { cargarHistorialNube(); }, 200);
        } catch(e) {
            alert("⚠️ Mensaje de la API: " + e.message);
        } finally {
            boton.textContent = "Autenticar Cuenta";
            boton.disabled = false;
        }
    }

    async function cargarHistorialNube() {
        if (!usuarioNube) return;
        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/chats/${usuarioNube._id}`);
            const chats = await res.json();
            const contenedorLateral = document.getElementById("lista-chats");
            const contenedorModal = document.getElementById("lista-chats-modal");
            contenedorLateral.innerHTML = "";
            if(contenedorModal) contenedorModal.innerHTML = "";
            chats.forEach(chat => {
                const esActivo = chat._id === chatActualId;
                const divLat = document.createElement("div");
                divLat.id = `chat-item-lat-${chat._id}`;
                divLat.className = `chat-item ${esActivo ? 'active' : ''}`;
                const spanTextLat = document.createElement("span");
                spanTextLat.className = "chat-item-text";
                spanTextLat.textContent = chat.titulo || "Conversación sin título";
                spanTextLat.onclick = () => abrirChatNube(chat._id, chat.mensajes);
                const btnDelLat = document.createElement("button");
                btnDelLat.className = "btn-delete-chat";
                btnDelLat.innerHTML = "🗑️";
                btnDelLat.onclick = (e) => { e.stopPropagation(); clickBotonPapelera(chat._id); };
                divLat.appendChild(spanTextLat);
                divLat.appendChild(btnDelLat);
                contenedorLateral.appendChild(divLat);

                if (contenedorModal) {
                    const divMod = document.createElement("div");
                    divMod.className = `chat-item ${esActivo ? 'active' : ''}`;
                    const spanTextMod = document.createElement("span");
                    spanTextMod.className = "chat-item-text";
                    spanTextMod.textContent = chat.titulo || "Conversación sin título";
                    spanTextMod.onclick = () => { abrirChatNube(chat._id, chat.mensajes); cerrarPantallaHistorial(); };
                    const btnDelMod = document.createElement("button");
                    btnDelMod.className = "btn-delete-chat";
                    btnDelMod.innerHTML = "🗑️";
                    btnDelMod.onclick = (e) => { e.stopPropagation(); clickBotonPapelera(chat._id); };
                    divMod.appendChild(spanTextMod);
                    divMod.appendChild(btnDelMod);
                    contenedorModal.appendChild(divMod);
                }
            });
            if (chats.length > 0 && !chatActualId) {
                chatActualId = chats[0]._id;
                abrirChatNube(chats[0]._id, chats[0].mensajes);
            }
        } catch(e){}
    }

    function abrirChatNube(chatId, mensajes) {
        chatActualId = chatId;
        guardarDato("gnartej_chat_actual_id", chatId);
        const chatBox = document.getElementById("chat-box");
        chatBox.innerHTML = "";
        if (mensajes && Array.isArray(mensajes)) {
            mensajes.forEach((msg, index) => {
                if (index === 0 && msg.role === 'system') return;
                const div = document.createElement("div");
                if (msg.role === 'user') {
                    div.className = "message user-message";
                    div.textContent = msg.content;
                } else {
                    div.className = "message ai-message";
                    div.innerHTML = formatearTextoConEnlaces(msg.content);
                }
                chatBox.appendChild(div);
            });
        }
        chatBox.scrollTop = chatBox.scrollHeight;
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        const itemActivoLateral = document.getElementById(`chat-item-lat-${chatId}`);
        if(itemActivoLateral) itemActivoLateral.classList.add('active');
    }

    async function crearNuevoChat() {
        if (!usuarioNube || estaPensando) return;
        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/chats/nuevo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: usuarioNube._id })
            });
            const nuevoChat = await res.json();
            chatActualId = nuevoChat._id;
            document.getElementById("chat-box").innerHTML = "";
            await cargarHistorialNube();
        } catch (e) {}
    }

    async function enviarMensaje() {
        const input = document.getElementById("user-input");
        const btnEnviar = document.getElementById("send-btn");
        const texto = input.value.trim();
        if (!texto || estaPensando) return;

        estaPensando = true;
        input.disabled = true;
        btnEnviar.disabled = true;
        if (!chatActualId) { await crearNuevoChat(); }
        input.value = "";

        const chatBox = document.getElementById("chat-box");
        const userDiv = document.createElement("div");
        userDiv.className = "message user-message";
        userDiv.textContent = texto;
        chatBox.appendChild(userDiv);

        const aiDiv = document.createElement("div");
        aiDiv.className = "message ai-message";
        aiDiv.textContent = "Pensando...";
        chatBox.appendChild(aiDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/chat/${chatActualId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: texto })
            });
            const data = await res.json();
            if (!res.ok) { throw new Error(data.error || "Fallo del servidor de IA"); }
            aiDiv.innerHTML = formatearTextoConEnlaces(data.reply);
            await cargarHistorialNube();
        } catch(e) {
            aiDiv.textContent = "Error al conectar con la IA. Inténtalo de nuevo.";
        } finally {
            estaPensando = false;
            input.disabled = false;
            btnEnviar.disabled = false;
            input.focus();
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    function clickBotonPapelera(chatId) {
        chatParaBorrarId = chatId;
        modal.style.display = 'flex';
    }

    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
        chatParaBorrarId = null;
    });

    btnConfirmar.addEventListener('click', async () => {
        if (chatParaBorrarId) {
            try {
                const response = await fetch(`${RENDER_BACKEND_URL}/api/chats/${chatParaBorrarId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    if (chatActualId === chatParaBorrarId) {
                        chatActualId = null;
                        borrarDato("gnartej_chat_actual_id");
                        document.getElementById("chat-box").innerHTML = "";
                    }
                    await cargarHistorialNube();
                }
            } catch (error) {} finally {
                modal.style.display = 'none';
                chatParaBorrarId = null;
            }
        }
    });

    function alternarVisibilidadPassword() {
        const input = document.getElementById("password-input");
        input.type = input.type === "password" ? "text" : "password";
    }

    function abrirPantallaCuenta() { document.getElementById("account-screen").style.display = "flex"; }
    function cerrarPantallaCuenta() { document.getElementById("account-screen").style.display = "none"; }
    function abrirPantallaHistorial() { document.getElementById("history-screen").style.display = "flex"; }
    function cerrarPantallaHistorial() { document.getElementById("history-screen").style.display = "none"; }
    function abrirPantallaSettings() { document.getElementById("settings-screen").style.display = "flex"; }
    function cerrarPantallaSettings() { document.getElementById("settings-screen").style.display = "none"; }
    function cerrarSesionNube() {
        activarInterfazDesconectado();
        cerrarPantallaCuenta();
    }
</script>
</body>
</html>
