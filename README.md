## Name

Lambda Pull

## Description

This function pulls files from SFTP /outbound and checks if there's any new files.

If none, email error and upload error file.

If yes, call next lambda to decrypt them.

## More

- No CI/CD was set up, depends on manual deployment for now.
- AWS credential profile used: ats-developer
