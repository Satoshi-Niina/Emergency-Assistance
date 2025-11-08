@echo off
echo Starting Emergency Assistance Server deployment...

REM Ensure node_modules exist
IF NOT EXIST node_modules (
    echo Installing dependencies...
    call npm install --production=false
)

echo Deployment completed successfully
echo Server ready to start with: node index.js