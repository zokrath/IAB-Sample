# IAB Sample
> WARNING: be aware, if your account is not a tester going through the payment process will make a real payment. You are responsible for not paying attention to this point!

This is a multi platform sample and test application for [Cordova IAB plugin](https://github.com/mohamnag/InAppBilling).

For more details on the plugin refer to its github page and wiki.

The application has been tested with local compilation process using phonegap CLI, you have to have that installed in order to be able to build and test the app locally. Alternatively you may use Phonegap Build which is currently not tested but shall work with no problem.

Inside the application, user may interact with the plugin manually, but there are also some Jasmine tests built in which will run as soon as the app is started. In case you want to disable this automatic run of tests, comment out the following line in `www\index.html`:

```html
<script type="text/javascript" src="spec/boot.js"></script>
```

## Local build
The code is known to be functional, compiled with Phonegap CLI:

```bash
$ phonegap run android
```
or
```bash
$ phonegap run ios
```

### Android
Because this plugin needs a signed APK for a serious test, the siging functionality is already activated. All you need is to do is:
- copy/rename the `platforms/android/secure.properties.template` to `platforms/android/secure.properties`
- open it and fill your own information, if you dont have a key refer to [this tutorial](http://developer.android.com/tools/publishing/app-signing.html) to create one.

### iOS
You need OS X and Xcode installed. You also need to be signed up for a development account for iOS. You have to already have obtained a provisioning profile from that development account in your Xcode.

# License
This code is provided to you under MIT license. A full copy is available here.
