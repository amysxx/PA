@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: 获取传入的端口号，如果没有传入，则默认为 3000
set PORT=%1
if "%PORT%"=="" set PORT=3000

echo [INFO] 开始查找占用端口 %PORT% 的所有进程...

set count=0
:: 使用 netstat 查找所有监听状态的并提取 PID
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%PORT%"') do (
    set found=0
    :: 防止重复杀同一个 PID（比如多个 Socket 监听）
    for %%p in (!PIDS!) do (
        if "%%p"=="%%a" set found=1
    )
    if "!found!"=="0" (
        set PIDS=!PIDS! %%a
        set /a count+=1
    )
)

if "%count%"=="0" (
    echo [INFO] 端口 %PORT% 当前未被占用。
) else (
    echo [INFO] 共找到 %count% 个独立进程占用端口 %PORT% : !PIDS!
    for %%p in (!PIDS!) do (
        if "%%p" neq "0" (
            echo [INFO] 正在终止进程 PID: %%p
            taskkill /F /PID %%p
            if !ERRORLEVEL! equ 0 (
                echo [SUCCESS] 进程 %%p 已成功终止。
            ) else (
                echo [ERROR] 无法终止进程 %%p，可能需要管理员权限。
            )
        )
    )
)

endlocal
