// Variables para controlar la ventana
const modal = document.getElementById('modal-confirmacion');
const btnCancelar = document.getElementById('btn-cancelar-borrar');
const btnConfirmar = document.getElementById('btn-confirmar-borrar');
let chatParaBorrarId = null; // Aquí guardamos el ID del chat temporalmente

// 1. Cuando el usuario hace clic en la papelera del chat
function clickBotonPapelera(chatId) {
    chatParaBorrarId = chatId; // Guardamos el ID
    modal.style.display = 'flex'; // Mostramos la ventana flotante cambiando el diseño a flex
}

// 2. Si el usuario se arrepiente y le da a Cancelar
btnCancelar.addEventListener('click', () => {
    modal.style.display = 'none'; // Escondemos la ventana
    chatParaBorrarId = null; // Limpiamos el ID
});

// 3. Si el usuario está seguro y le da a "Sí, eliminar"
btnConfirmar.addEventListener('click', async () => {
    if (chatParaBorrarId) {
        try {
            // Llamamos a tu API de Render que acabamos de corregir
            const response = await fetch(`https://gnartej-api.onrender.com/api/chats/${chatParaBorrarId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log("Chat borrado con éxito");
                // Aquí añades tu función para recargar la lista de chats en la pantalla
                // Ejemplo: cargarChatsDelUsuario(); 
            } else {
                alert("No se pudo borrar el chat");
            }
        } catch (error) {
            console.error("Error al conectar con la API:", error);
        } finally {
            // Pase lo que pase, cerramos la ventana al terminar
            modal.style.display = 'none';
            chatParaBorrarId = null;
        }
    }
});
