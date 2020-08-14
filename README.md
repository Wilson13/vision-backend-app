# Name
Lambda Pull

# Description
This function pulls files from SFTP /outbound and checks if there's any new files.

If no, email error and upload error file.

If yes, call next lambda to decrypt them.