@echo off
chcp 65001 >nul
echo ========================================
echo    ACTUALIZADOR DE URL DEL REPRODUCTOR
echo ========================================
echo.

REM Verificar si existe el archivo stream_url.txt
if not exist "stream_url.txt" (
    echo ERROR: No se encuentra el archivo stream_url.txt
    echo Por favor, asegurate de que el archivo existe en el mismo directorio.
    pause
    exit /b 1
)

REM Verificar si existe el archivo reproductor.html
if not exist "reproductor.html" (
    echo ERROR: No se encuentra el archivo reproductor.html
    echo Por favor, asegurate de que el archivo existe en el mismo directorio.
    pause
    exit /b 1
)

echo Leyendo nueva URL desde stream_url.txt...
set /p NEW_URL=<stream_url.txt

REM Verificar si la URL no está vacía
if "%NEW_URL%"=="" (
    echo ERROR: El archivo stream_url.txt está vacío
    pause
    exit /b 1
)

echo Nueva URL detectada:
echo %NEW_URL%
echo.

echo Actualizando reproductor.html...

REM Crear un archivo temporal con la nueva URL
powershell -Command "(Get-Content 'reproductor.html' -Raw) -replace 'const streamUrl = ''[^'']*'';', 'const streamUrl = ''%NEW_URL%'';' | Set-Content 'reproductor_temp.html'"

REM Verificar si la operación fue exitosa
if exist "reproductor_temp.html" (
    REM Reemplazar el archivo original
    move /y "reproductor_temp.html" "reproductor.html" >nul
    
    if exist "reproductor.html" (
        echo.
        echo ========================================
        echo    ¡URL ACTUALIZADA EXITOSAMENTE!
        echo ========================================
        echo.
        echo El reproductor ahora usa la nueva URL:
        echo %NEW_URL%
        echo.
        echo Puedes abrir reproductor.html en tu navegador.
    ) else (
        echo ERROR: No se pudo actualizar el archivo reproductor.html
    )
) else (
    echo ERROR: No se pudo crear el archivo temporal
)

echo.
pause 