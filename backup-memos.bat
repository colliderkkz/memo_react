@echo off
chcp 65001 >nul
cd /d "%~dp0"
title my-memos 备份

rem 服务运行中时数据库可能有正在写入的事务快照，先提醒
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [备份] 检测到 my-memos 服务正在运行。
    echo 建议先关闭服务窗口再备份，否则可能得到不一致的数据库快照。
    choice /c YN /m "仍要立即备份? Y=继续, N=取消"
    if errorlevel 2 goto end
)

if not exist "data" (
    echo [备份] 找不到数据目录 data\，还没有任何数据。
    goto end
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set STAMP=%%i
if not exist backups mkdir backups
set ZIP=backups\memos-backup-%STAMP%.zip

echo [my-memos] 正在备份数据到 %ZIP% ...
powershell -NoProfile -Command "Compress-Archive -Path 'data\*' -DestinationPath '%ZIP%' -Force"
if errorlevel 1 (
    echo [错误] 备份失败。
    goto end
)
echo [my-memos] 备份完成：%ZIP%
echo [my-memos] 恢复方法：停服务后，把 zip 内容解压覆盖回 data\ 即可。

:end
echo.
pause
