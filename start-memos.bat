@echo off
chcp 65001 >nul
cd /d "%~dp0"
title my-memos

rem 服务已在运行则直接打开浏览器
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [my-memos] 服务已在运行，直接打开浏览器。
    start "" "http://localhost:3000"
    exit /b 0
)

echo [my-memos] 正在启动服务，就绪后自动打开浏览器（首次启动约几秒）...
echo [my-memos] 使用期间请保持本窗口开着；关闭窗口或 Ctrl+C 即停止服务。
echo.

rem 后台轮询端口，就绪后自动打开浏览器（最多等 3 分钟）
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "$ok=$false; foreach($i in 1..90){ if(Test-NetConnection localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue){ $ok=$true; break }; Start-Sleep -Seconds 2 }; if($ok){ Start-Process 'http://localhost:3000' }"

rem 没有构建产物时先构建一次（生产模式运行，启动快、占用小）
if not exist ".next\BUILD_ID" (
    echo [my-memos] 首次运行，先执行生产构建（只需一次，约 1 分钟）...
    corepack pnpm build
    if errorlevel 1 (
        echo [错误] 构建失败，请检查上方输出。
        pause
        exit /b 1
    )
)

corepack pnpm start
