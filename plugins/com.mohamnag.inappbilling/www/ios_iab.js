/**
 * In App Billing Plugin
 * @module InAppBilling
 * 
 * @overview This file implements a JavaScript interface for Android to the 
 * native code. The signature of this interface has to match the one from iOS 
 * in `android_iab.js`.
 * 
 * Details and more information on {@link module:InAppBilling}
 * 
 * @author Mohammad Naghavi - {@link mohamnag.com}
 * @license MIT
 */

/**
 * All the failure callbacks have the same signature as this.
 * 
 * @callback errorCallback
 * @param {Object}  error   the information about the error
 * @param {int}     error.errorCode one of the error codes defined with ERR_*
 * @param {string}  error.msg   a textual message intended for developer in order to make debuging easier
 * @param {Object}  error.nativeEvent additional    information mainly intended for debug process which will not be present if the source of error is not IAB
 * @param {int}     error.nativeEvent.IabResponse   response code coming from IabHelper
 * @param {string}  error.nativeEvent.IabMessage    message text coming from IabHelper
 */

var noop = function() {
};

/**
 * @constructor
 * @alias module:InAppBilling
 */
var InAppBilling = function() {
    this.options = {};
};

/**
 * Error codes base.
 * 
 * all the codes bellow should be kept synchronized between: 
 *  * InAppPurchase.m
 *  * InAppBillingPlugin.java 
 *  * android_iab.js 
 *  * ios_iab.js
 * 
 * Be carefull assiging new codes, these are meant to express the REASON of 
 * the error as exact as possible!
 * 
 * @private
 */
ERROR_CODES_BASE = 4983497;
InAppBilling.prototype.ERR_SETUP = ERROR_CODES_BASE + 1;
InAppBilling.prototype.ERR_LOAD = ERROR_CODES_BASE + 2;
InAppBilling.prototype.ERR_PURCHASE = ERROR_CODES_BASE + 3;
InAppBilling.prototype.ERR_LOAD_RECEIPTS = ERROR_CODES_BASE + 4;
InAppBilling.prototype.ERR_CLIENT_INVALID = ERROR_CODES_BASE + 5;
InAppBilling.prototype.ERR_PAYMENT_CANCELLED = ERROR_CODES_BASE + 6;
InAppBilling.prototype.ERR_PAYMENT_INVALID = ERROR_CODES_BASE + 7;
InAppBilling.prototype.ERR_PAYMENT_NOT_ALLOWED = ERROR_CODES_BASE + 8;
InAppBilling.prototype.ERR_UNKNOWN = ERROR_CODES_BASE + 10;
InAppBilling.prototype.ERR_LOAD_INVENTORY = ERROR_CODES_BASE + 11;
InAppBilling.prototype.ERR_HELPER_DISPOSED = ERROR_CODES_BASE + 12;
InAppBilling.prototype.ERR_NOT_INITIALIZED = ERROR_CODES_BASE + 13;
InAppBilling.prototype.ERR_INVENTORY_NOT_LOADED = ERROR_CODES_BASE + 14;
InAppBilling.prototype.ERR_PURCHASE_FAILED = ERROR_CODES_BASE + 15;
InAppBilling.prototype.ERR_JSON_CONVERSION_FAILED = ERROR_CODES_BASE + 16;
InAppBilling.prototype.ERR_INVALID_PURCHASE_PAYLOAD = ERROR_CODES_BASE + 17;
InAppBilling.prototype.ERR_SUBSCRIPTION_NOT_SUPPORTED = ERROR_CODES_BASE + 18;
InAppBilling.prototype.ERR_CONSUME_NOT_OWNED_ITEM = ERROR_CODES_BASE + 19;
InAppBilling.prototype.ERR_CONSUMPTION_FAILED = ERROR_CODES_BASE + 20;


// TODO: this shall be removed!
var protectCall = function (callback, context) {
    try {
        var args = Array.prototype.slice.call(arguments, 2); 
        callback.apply(this, args);
    }
    catch (err) {
        log('exception in ' + context + ': "' + err + '"');
    }
};

/**
 * This function accepts and outputs all the logs, both from native and from JS
 * this is intended to make the debuging easier, you only need to have access to 
 * JS console output.
 * 
 * @param {String} msg
 * @private
 */
InAppBilling.prototype.log = function (msg) {
    console.log("InAppBilling[js]: " + msg);
};

// this stores purchases and their callbacks as long as they are on the queue
InAppBilling.prototype._queuedPurchases = {};

// this stores callbacks for restore function, until restore process is finished
InAppBilling.prototype._restoreCallbacks = {}


InAppBilling.prototype.init = function (success, fail, options, skus) {
    this.log('init called!');
    options || (options = {});

    this.options = {
        showLog: options.showLog || true
    };

    //TODO: load skus (productIds) if provided, after setup before success call
    //TODO: match the arguments passed to success and fail callbacks with andorid

    // show log or mute the log
    //TODO: this shall be applied to android too
    if (this.options.showLog) {
        cordova.exec(noop, noop, "InAppPurchase", 'debug', []);
    }
    else {
        this.log = noop;
    }

    cordova.exec(success, fail, "InAppPurchase", 'init', []);
};

//TODO: complete this and sync it with iOS
/**
 * @typedef {Object} purchase
 */

/**
 * The success callback for [getPurchases]{@link module:InAppBilling#getPurchases}
 * 
 * @callback getPurchasesSuccessCallback
 * @param {Array.<purchase>} purchaseList
 */

/**
 * This will return the already boutgh items. The consumed items will not be on
 * this list, nor can be retrieved with any other method.
 * 
 * @param {getPurchasesSuccessCallback} success
 * @param {errorCallback} fail
 */
InAppBilling.prototype.getPurchases = function (success, fail) {
    this.log('getPurchases called!');
    
    cordova.exec(success, fail, "InAppPurchase", 'getPurchases', []);    
};

// Merged with InAppPurchase.prototype.purchase
//TODO: sync fail and success callback params with android interface
InAppBilling.prototype.buy = function (success, fail, productId) {
    this.log('buy called!');

    cordova.exec(success, fail, "InAppPurchase", 'buy', [productId]);

    return;


    // after we call the native code, we have a queue and we dont really know how to map callbacks to items 
    // on the queue, for this reason we serialize the callbacks and put it together with productId on a cache.
    // current solution:
    //      allow only ONE purchase request per product id and keep callbacks under prod id and wait until it 
    //      is finished
    // IF you know a better way to attach these callbacks to this specific purchase, then help improve it!
    if(typeof InAppBilling._queuedPurchases.productId !== 'undefined') {
        this.log(productId + ' is already on the purchase queue.');
        protectCall(fail, 'options.error', InAppBilling.prototype.ERR_PURCHASE, productId);
        return;
    }

    // enqueued does not mean bought! here we shall keep success callback for later when transaction is updated
    var purchaseEnqueued = function () {
        _that.log('Purchase enqueued ' + productId);
        // here do nothing and keep the success callback for the time that queue is updated
        // we also have to keep the fail callback for queue update
        InAppBilling._queuedPurchases.productId = {
            'success': success,
            'fail': fail
        };
    };

    // fail is fail, even not being able to put on queue! 
    var purchaseEnqueueFailed = function () {
        var msg = 'Enqueuing ' + productId + ' failed';
        _that.log(msg);
        protectCall(fail, 'options.error', InAppBilling.prototype.ERR_PURCHASE, productId);
    };

    cordova.exec(purchaseEnqueued, purchaseEnqueueFailed, "InAppPurchase", 'purchase', [productId, 1]);
};

// on iOS, this does exactly what buy does!
InAppBilling.prototype.subscribe = function (success, fail, productId) {
    this.log('subscribe called!');

    return InAppBilling.buy(success, fail, productId);
};

/***
 * iOS ONLY: try not to use it, however this is a must to have for iTunes.
 * Asks store to re-queue previously processed transaction.
 *
 * This is the exceptional one to have three callbacks. Additional one is 
 * needed if restoration does really activate no transactions (user did not 
 * have bought anything).
 * 
 * @param  {[type]} success
 * @param  {[type]} fail
 * @param  {[type]} finish
 * @return {[type]}
 */
InAppBilling.prototype.restore = function(success, fail, finish) {
    // we store the callbacks for later call
    InAppBilling._restoreCallbacks = {
        'success': success,
        'fail': fail,
        'finish': finish
    };
    cordova.exec(noop, noop, "InAppPurchase", 'restoreCompletedTransactions', []);
};

/**
 * This is called from native!
 */
InAppBilling.prototype.restoreCompletedTransactionsFinished = function () {
    protectCall(InAppBilling._restoreCallbacks.finish, 'options.restoreCompleted');
    InAppBilling._restoreCallbacks = {};
};

/**
 * This is called from native!
 */
InAppBilling.prototype.restoreCompletedTransactionsFailed = function (errorCode) {
    protectCall(InAppBilling._restoreCallbacks.fail, 'options.restoreFailed', errorCode);
    InAppBilling._restoreCallbacks = {};
};

/***
 * Retrieves localized product data, including price (as localized
 * string), name, description of multiple products.
 *
 * @param {Array} productIds
 *   An array of product identifier strings.
 *
 * @param {Function} callback
 *   Called once with the result of the products request. Signature:
 *
 *     function(validProducts, invalidProductIds)
 *
 *   where validProducts receives an array of objects of the form:
 *
 *     {
 *       id: "<productId>",
 *       title: "<localised title>",
 *       description: "<localised escription>",
 *       price: "<localised price>"
 *     }
 *
 *  and invalidProductIds receives an array of product identifier
 *  strings which were rejected by the app store.
 */
// merged with InAppPurchase.prototype.load
InAppBilling.prototype.getProductDetails = function (success, fail, productIds) {
    var options = this.options;
    if (typeof productIds === "string") {
        productIds = [productIds];
    }

    if (!productIds) {
        // Empty array, nothing to do.
        protectCall(success, 'load.callback', [], []);
    }

    else if (!productIds.length) {
        // Empty array, nothing to do.
        return;
    }
    else {
        if (typeof productIds[0] !== 'string') {
            var msg = 'invalid productIds given to store.load: ' + JSON.stringify(productIds);
            this.log(msg);
            protectCall(fail, 'options.error', InAppBilling.prototype.ERR_LOAD, msg);
            return;
        }
        this.log('load ' + JSON.stringify(productIds));

        var _that = this;
        var loadOk = function (array) {
            var valid = array[0];
            var invalid = array[1];
            _that.log('load ok: { valid:' + JSON.stringify(valid) + ' invalid:' + JSON.stringify(invalid) + ' }');
            protectCall(success, 'load.callback', valid, invalid);
        };

        var loadFailed = function (errMessage) {
            _that.log('load failed: ' + errMessage);
            protectCall(fail, 'options.error', InAppBilling.prototype.ERR_LOAD, 'Failed to load product data: ' + errMessage);
        };

        InAppBilling._productIds = productIds;
        cordova.exec(loadOk, loadFailed, "InAppPurchase", 'load', [productIds]);
    }
};

/***
 * This is called from native!
 */
InAppBilling.prototype.updatedTransactionCallback = function (state, errorCode, errorText, transactionIdentifier, productId, transactionReceipt) {
    //TODO: remove this and pass on the receipt directly to the callback! complete app's receipt can be obtained by calling getPurchases
    if (transactionReceipt) {
        InAppBilling.receiptForProduct[productId] = transactionReceipt;
        InAppBilling.receiptForTransaction[transactionIdentifier] = transactionReceipt;
    }

    switch(state) {
        case "PaymentTransactionStatePurchased":
            // nothing to do, we will inform success after FINISHING the transaction
            return; 

        case "PaymentTransactionStateFailed":
            if(typeof InAppBilling._queuedPurchases.productId !== 'undefined') {
                protectCall(
                    InAppBilling._queuedPurchases.productId.fail, 
                    'options.purchase', 
                    transactionIdentifier, 
                    productId
                );
            }
            delete InAppBilling._queuedPurchases.productId;
            return;

        case "PaymentTransactionStateRestored":
            protectCall(InAppBilling._restoreCallbacks.finish, 'options.restoreCompleted', transactionIdentifier, productId);
            return;

        case "PaymentTransactionStateFinished":
            if(typeof InAppBilling._queuedPurchases.productId !== 'undefined') {
                protectCall(
                    InAppBilling._queuedPurchases.productId.success, 
                    'options.purchase', 
                    transactionIdentifier, 
                    productId
                );
            }
            delete InAppBilling._queuedPurchases.productId;
            return;
    }
};

/***
 * This consumes a bought product.
 * 
 * @param  {[type]} success
 * @param  {[type]} fail
 * @param  {[type]} productId
 * @return {[type]}
 */
InAppBilling.prototype.consumePurchase = function (success, fail, productId) {
    this.log('consumePurchase called!');


    //TODO: implement it for iOS!
    // return cordova.exec(success, fail, "InAppBillingPlugin", "consumePurchase", [productId]);
};

/***
 * This will return the list of localized products information which are already loaded in the application.
 * 
 * @param  {[type]} success
 * @param  {[type]} fail
 * @return {[type]}
 */
InAppBilling.prototype.getAvailableProducts = function (success, fail) {
    this.log('getAvailableProducts called!');


    //TODO: implement this for iOS!
    // return cordova.exec(success, fail, "InAppBillingPlugin", "getAvailableProducts", ["null"]);
};

module.exports = new InAppBilling();

// ========= from here on, we have the original iOS JS interface. some parts are commented out 
// ========= in favour of the new ones before.

/***
 * A plugin to enable iOS In-App Purchases.
 *
 * Copyright (c) Matt Kane 2011
 * Copyright (c) Guillaume Charhon 2012
 * Copyright (c) Jean-Christophe Hoelt 2013
 */

//TODO: impelement receipt verification (automatically) for iOS too
/*
InAppPurchase.prototype.verifyReceipt = function (success, error) {
    var receiptOk = function () {
        log("Receipt validation success");
        if (success)
            protectCall(success, 'verifyReceipt.success', reason);
    };
    var receiptError = function (reason) {
        log("Receipt validation failed: " + reason);
        if (error)
            protectCall(error, 'verifyReceipt.error', reason);
    };
    exec('verifyReceipt', [], receiptOk, receiptError);
};
*/

// Not really sure if they are used or not, commenting out!
// /*
//  * This queue stuff is here because we may be sent events before listeners have been registered. This is because if we have 
//  * incomplete transactions when we quit, the app will try to run these when we resume. If we don't register to receive these
//  * right away then they may be missed. As soon as a callback has been registered then it will be sent any events waiting
//  * in the queue.
//  */
// InAppPurchase.prototype.runQueue = function () {
// 	if(!this.eventQueue.length || (!this.onPurchased && !this.onFailed && !this.onRestored)) {
// 		return;
// 	}
// 	var args;
// 	/* We can't work directly on the queue, because we're pushing new elements onto it */
// 	var queue = this.eventQueue.slice();
// 	this.eventQueue = [];
//     args = queue.shift();
// 	while (args) {
// 		this.updatedTransactionCallback.apply(this, args);
//         args = queue.shift();
// 	}
// 	if (!this.eventQueue.length) {	
// 		this.unWatchQueue();
// 	}
// };

// InAppPurchase.prototype.watchQueue = function () {
// 	if (this.timer) {
// 		return;
// 	}
// 	this.timer = window.setInterval(function () {
//         window.storekit.runQueue();
//     }, 10000);
// };

// InAppPurchase.prototype.unWatchQueue = function () {
// 	if (this.timer) {
// 		window.clearInterval(this.timer);
// 		this.timer = null;
// 	}
// };

// InAppPurchase.prototype.eventQueue = [];
// InAppPurchase.prototype.timer = null;

// module.exports = new InAppPurchase();

