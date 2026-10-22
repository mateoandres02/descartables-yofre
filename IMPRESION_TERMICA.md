# Impresión térmica por PowerShell

No hay QZ Tray, certificados ni claves de impresión en Vercel. Como un navegador no puede ejecutar PowerShell directamente, la computadora que tiene conectada la TP-POS58-USB ejecuta un agente local muy pequeño. Este agente acepta conexiones únicamente desde `127.0.0.1`, valida el origen de la web y verifica la sesión contra el backend antes de enviar ESC/POS RAW al spooler de Windows.

## Una vez por computadora

1. Instalar el controlador de la impresora y comprobar que aparezca en **Impresoras y escáneres** de Windows.
2. Copiar la carpeta `printing-agent` a esa computadora.
3. Editar `printing-agent/agent.config.json` con las URLs reales, sin barra final:

```json
{
  "port": 9108,
  "appOrigin": "https://tu-frontend.vercel.app",
  "apiUrl": "https://tu-backend.vercel.app/api"
}
```

4. Abrir PowerShell en esa carpeta y ejecutar:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\start-print-agent.ps1
```

5. Ingresar a la app como administrador, ir a **Configuración → Impresora térmica**, seleccionar la impresora y usar **Imprimir prueba**.

El proceso de PowerShell debe permanecer activo mientras se use la caja. El envío al spooler no abre ventanas, vista previa, selector de impresora ni diálogo de Windows. La confirmación en la app indica que Windows aceptó el trabajo; no puede garantizar que el papel haya salido.
