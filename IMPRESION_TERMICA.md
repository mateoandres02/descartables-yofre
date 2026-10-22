# Impresión térmica por PowerShell

No hay QZ Tray, certificados ni claves de impresión en Vercel. Como un navegador no puede ejecutar PowerShell directamente, la computadora que tiene conectada la TP-POS58-USB ejecuta un agente local muy pequeño. Este agente acepta conexiones únicamente desde `127.0.0.1`, valida el origen de la web y verifica la sesión contra el backend antes de enviar ESC/POS RAW al spooler de Windows.

## Una vez por computadora

1. Instalar el controlador de la impresora y comprobar que aparezca en **Impresoras y escáneres** de Windows.
2. Copiar la carpeta `printing-agent` a esa computadora.
3. El paquete ya viene configurado para producción en `printing-agent/archivos-internos/agent.config.json`:

```json
{
  "port": 9108,
  "appOrigin": "https://descartables-yofre.vercel.app",
  "apiUrl": "https://descartables-yofre-backend.vercel.app/api"
}
```

4. Hacer doble clic una sola vez en `INSTALAR-IMPRESORA-UNA-VEZ.cmd`. Es el único archivo que se debe ejecutar. El instalador copia los archivos técnicos desde `archivos-internos` a `%LOCALAPPDATA%\DescartablesYofre\PrintAgent`, inicia el agente oculto y lo registra para arrancar automáticamente con cada inicio de sesión de Windows. El usuario no necesita abrir consolas ni repetir este paso diariamente.

5. Abrir la web de producción. Si el navegador solicita permiso para acceder a dispositivos o a la red local, permitirlo para este sitio.
6. Ingresar a la app como administrador, ir a **Configuración → Impresora térmica**, seleccionar la impresora y usar **Imprimir prueba**.

El agente queda ejecutándose en segundo plano. Si se detiene inesperadamente, su supervisor lo vuelve a iniciar. Los registros de diagnóstico quedan en `%LOCALAPPDATA%\DescartablesYofre\PrintAgent\logs`. El envío al spooler no abre ventanas, vista previa, selector de impresora ni diálogo de Windows.
