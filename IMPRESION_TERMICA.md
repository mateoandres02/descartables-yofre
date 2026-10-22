# Impresión térmica silenciosa con Google Chrome

La aplicación imprime mediante el modo `--kiosk-printing` de Google Chrome. No requiere QZ Tray, certificados, agentes locales ni procesos PowerShell ejecutándose permanentemente.

## Instalación única en la computadora de caja

1. Instalar el controlador de la Global TP-POS58-USB y confirmar que Windows la reconoce.
2. Descargar o copiar la carpeta `chrome-silent-printing` en esa computadora.
3. Hacer doble clic en `INSTALAR-ACCESO-DIRECTO-CHROME.cmd`.
4. El instalador busca Chrome, intenta dejar la impresora POS como predeterminada cuando detecta una única opción y crea **Descartables Yofre** en el escritorio.
5. Abrir siempre el sistema desde ese acceso directo. La primera vez será necesario iniciar sesión porque utiliza un perfil de Chrome exclusivo para la caja.

Al confirmar o reimprimir una venta, Chrome envía el ticket directamente a la impresora predeterminada con sus ajustes actuales. No abre la vista previa ni pide seleccionar una impresora.

## Si imprime en otra impresora

En Windows, abrir **Configuración → Bluetooth y dispositivos → Impresoras y escáneres**, seleccionar la TP-POS58 y establecerla como predeterminada. Conviene desactivar “Permitir que Windows administre mi impresora predeterminada”.

El navegador no permite que una página web enumere impresoras instaladas. Por eso la aplicación muestra “Impresora predeterminada de Windows” y la selección se realiza una sola vez en Windows.
