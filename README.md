# Google Cloud Vision API - Object Detection

### Name

vision-backend-app

### Description

This is a simple project that demonstrates the usage of NodeJS, ExpressJS, AWS Lambda, Serverless Framework, and Google Cloud Vision API.

## Running

### Local

    npm run offline

Running this app locally depends on the Serverless Offline plugin, but multer doesn't play well with it hence uploaded file or image will not be working (corrupted in the form of having a larger file size compared to original).

Also, currently I'm running it on a x86 MacOS, the image processing library 'sharp' installs the 'darwin-x64' version binaries.

But deploying it into the AWS Lambda would require the 'linux-x64' version, this is done by running the following command before deploying using the Serverless framework:

    rm -rf node_modules/sharp
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux sharp

This step is currently performed during the build process in the AWS CodeBuild (check buildspec_dev.yml).

## Deployment

### Manual

    npm run deploy-dev

When deploying locally, be sure to run the following command so the build source can run in AWS Lambda successfully. [Check reason here](#deployment]).

    rm -rf node_modules/sharp
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux sharp

### Automated

Currently CI/CD pipeline is deployed using AWS CodePipeline and AWS CodeBuild, deployment is performed during the build stage.

## Notes

- Wanted to perform the drawing of bounding boxes in front end (Static Site using NextJS for SSG) but couldn't do it due to Sharp library dependency on fs, which is only available in NodeJS.
- Multer file upload doesn't work properly in serverless offline mode
- Still requires some refactoring and code clean up.

## TODO

- Still haven't figured a good way to reference Google Cloud Service Account key JSON file properly. Have tried downloading it and saving to file from AWS SSM Paremeter Store, but so far has failed to move it into the eventual deployed Lambda function's '/tmp' directory.
- Drawing bounding boxes on uploaded and detected image works now, but not sure why some times one of the boxes is missing.

## References

- https://blog.mturk.com/tutorial-generating-images-with-bounding-boxes-on-the-fly-using-aws-lambda-690d2301a5ff
- https://cloud.google.com/vision/docs/reference/rest/v1p2beta1/images/annotate
