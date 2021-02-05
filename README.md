# Object Detection Example

### Name

vision-backend-app

### Description

This is a simple project that demonstrates the usage of NodeJS, ExpressJS, AWS Lambda, Serverless Framework, and Google Vision API.

## Notes

- Wanted to perform the drawing of bounding boxes in front end (Static Site using NextJS for SSG) but couldn't do it due to Sharp library dependency on fs, which is only available in NodeJS.
- Multer file upload doesn't work properly in serverless offline mode
- Still requires some refactoring and code clean up.
