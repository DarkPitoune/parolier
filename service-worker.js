/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-1b24e8e1'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "android/android-launchericon-144-144.png",
    "revision": "9a809efcf29d348f2a3bc097f96f995d"
  }, {
    "url": "android/android-launchericon-192-192.png",
    "revision": "1acc4e12128d42c364f10b19669ef329"
  }, {
    "url": "android/android-launchericon-48-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "android/android-launchericon-512-512.png",
    "revision": "2bde476d8f73cff449c4c5f0cdb3f0b5"
  }, {
    "url": "android/android-launchericon-72-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "android/android-launchericon-96-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "assets/browser-CeFnEsxi.js",
    "revision": null
  }, {
    "url": "assets/index-DCXwM4Ni.js",
    "revision": null
  }, {
    "url": "assets/index-DwZDbzmd.css",
    "revision": null
  }, {
    "url": "favicon.png",
    "revision": "c0dcd189d80d6f1e9d86ea62a63327a5"
  }, {
    "url": "index.html",
    "revision": "bf3888309374d33692ab0cb4c2271b6d"
  }, {
    "url": "ios/100.png",
    "revision": "41310455f6bb716ebfa06476c3da9e0d"
  }, {
    "url": "ios/1024.png",
    "revision": "d970c03e6b7e84d9e10f9af33f04db8e"
  }, {
    "url": "ios/114.png",
    "revision": "649da24ed9a29c80c1bf4b94dccb6769"
  }, {
    "url": "ios/120.png",
    "revision": "ea067b199771aff32d7f2cfa89bc43c8"
  }, {
    "url": "ios/128.png",
    "revision": "9d63c3948bcf09d17d6f24139be66de6"
  }, {
    "url": "ios/144.png",
    "revision": "9a809efcf29d348f2a3bc097f96f995d"
  }, {
    "url": "ios/152.png",
    "revision": "b8aafdfaa7dde0703cc0f13a74ac60c5"
  }, {
    "url": "ios/16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "ios/167.png",
    "revision": "e5fe5b8d1e369262a57f4f33c59786ff"
  }, {
    "url": "ios/180.png",
    "revision": "31c64954e65a47fa18bbe6d41c957c96"
  }, {
    "url": "ios/192.png",
    "revision": "1acc4e12128d42c364f10b19669ef329"
  }, {
    "url": "ios/20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "ios/256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "ios/29.png",
    "revision": "9eca9d5cc5e05b51c4bbfbaf03a197fc"
  }, {
    "url": "ios/32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "ios/40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "ios/50.png",
    "revision": "404441fe2ca139ff2f81a75a0469bd7d"
  }, {
    "url": "ios/512.png",
    "revision": "2bde476d8f73cff449c4c5f0cdb3f0b5"
  }, {
    "url": "ios/57.png",
    "revision": "588ddabf6195f1e46fdc6ef1715bf23d"
  }, {
    "url": "ios/58.png",
    "revision": "e6433dfb9edb8d29385a7bc39389ea7d"
  }, {
    "url": "ios/60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "ios/64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "ios/72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "ios/76.png",
    "revision": "c62fbb1b973e0545055894c6c5d287d4"
  }, {
    "url": "ios/80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "ios/87.png",
    "revision": "eefe24578d1b61e1fbc8a5e825ef52a7"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "screenshots/mobile.jpg",
    "revision": "e2af888ea7bdc19b43f33272b2286f9f"
  }, {
    "url": "windows11/LargeTile.scale-100.png",
    "revision": "73d82b568578225e2658475d2c29e590"
  }, {
    "url": "windows11/LargeTile.scale-125.png",
    "revision": "e0b224d3f8b21f52b4fcd666e0d3e6d0"
  }, {
    "url": "windows11/LargeTile.scale-150.png",
    "revision": "fe55f2bab6b92a54298816adc51f0043"
  }, {
    "url": "windows11/LargeTile.scale-200.png",
    "revision": "2bcd56ca744b855f5111db7cb68b375a"
  }, {
    "url": "windows11/LargeTile.scale-400.png",
    "revision": "405b28b048848018ada4d8c7b416ea01"
  }, {
    "url": "windows11/SmallTile.scale-100.png",
    "revision": "498e848a64676e7f277af41ad7bd968a"
  }, {
    "url": "windows11/SmallTile.scale-125.png",
    "revision": "ca7b02a2017aab56fa534d928f924047"
  }, {
    "url": "windows11/SmallTile.scale-150.png",
    "revision": "7ab7b5c4886c634807855f2681eb1355"
  }, {
    "url": "windows11/SmallTile.scale-200.png",
    "revision": "cb1e1c57e2e1b0bb8a8f3bce6460e992"
  }, {
    "url": "windows11/SmallTile.scale-400.png",
    "revision": "efd13ea8ef20c3ea9368f60b77b68634"
  }, {
    "url": "windows11/SplashScreen.scale-100.png",
    "revision": "cac57db7cfcf7be2269d248ce9b3996c"
  }, {
    "url": "windows11/SplashScreen.scale-125.png",
    "revision": "73eb916f4f6576cc07904ca4a654d81b"
  }, {
    "url": "windows11/SplashScreen.scale-150.png",
    "revision": "f70733c22e38460802df1e46d63944be"
  }, {
    "url": "windows11/SplashScreen.scale-200.png",
    "revision": "5da50789854cd7c9f666dd9af9112f95"
  }, {
    "url": "windows11/SplashScreen.scale-400.png",
    "revision": "2afe26dab3669ef0f134b786139d69c6"
  }, {
    "url": "windows11/Square150x150Logo.scale-100.png",
    "revision": "ab9a2739d0d37ea4be241cc48df58346"
  }, {
    "url": "windows11/Square150x150Logo.scale-125.png",
    "revision": "5532be25b0071d482d7283c174c6fd49"
  }, {
    "url": "windows11/Square150x150Logo.scale-150.png",
    "revision": "792e0be23a18dfe44f22164d8d2a59be"
  }, {
    "url": "windows11/Square150x150Logo.scale-200.png",
    "revision": "aecd61c491207271ac380b54a240e20b"
  }, {
    "url": "windows11/Square150x150Logo.scale-400.png",
    "revision": "3fd548f63905decac32075f9db210bed"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/Square44x44Logo.scale-100.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.scale-125.png",
    "revision": "e698c97314a72d406361bb1f267e8c3d"
  }, {
    "url": "windows11/Square44x44Logo.scale-150.png",
    "revision": "4e99c066e447d71c765a6e394c72de83"
  }, {
    "url": "windows11/Square44x44Logo.scale-200.png",
    "revision": "fe61b35091a06ff038c7e4c008bd412b"
  }, {
    "url": "windows11/Square44x44Logo.scale-400.png",
    "revision": "085ff58de86953a3ed589277af73d72d"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/StoreLogo.scale-100.png",
    "revision": "ed4d3a8e6a7e25fad86096f16d03582d"
  }, {
    "url": "windows11/StoreLogo.scale-125.png",
    "revision": "0210305b1dc04b53c70449a2bb61f48c"
  }, {
    "url": "windows11/StoreLogo.scale-150.png",
    "revision": "44bbc9ebe2e2d5e205b447afd5f25771"
  }, {
    "url": "windows11/StoreLogo.scale-200.png",
    "revision": "9ffa9723edde4469d742547445fb354f"
  }, {
    "url": "windows11/StoreLogo.scale-400.png",
    "revision": "853fd2e182f2d4ea3cbdd816a9494c49"
  }, {
    "url": "windows11/Wide310x150Logo.scale-100.png",
    "revision": "52a6d041f90137b029252ccdaa1dfa5e"
  }, {
    "url": "windows11/Wide310x150Logo.scale-125.png",
    "revision": "a39bbdf326180462f89f21fe807d2ef0"
  }, {
    "url": "windows11/Wide310x150Logo.scale-150.png",
    "revision": "1f9277e34cb5b5ed8f16eefdb310657e"
  }, {
    "url": "windows11/Wide310x150Logo.scale-200.png",
    "revision": "cac57db7cfcf7be2269d248ce9b3996c"
  }, {
    "url": "windows11/Wide310x150Logo.scale-400.png",
    "revision": "5da50789854cd7c9f666dd9af9112f95"
  }, {
    "url": "windows11/SmallTile.scale-100.png",
    "revision": "498e848a64676e7f277af41ad7bd968a"
  }, {
    "url": "windows11/SmallTile.scale-125.png",
    "revision": "ca7b02a2017aab56fa534d928f924047"
  }, {
    "url": "windows11/SmallTile.scale-150.png",
    "revision": "7ab7b5c4886c634807855f2681eb1355"
  }, {
    "url": "windows11/SmallTile.scale-200.png",
    "revision": "cb1e1c57e2e1b0bb8a8f3bce6460e992"
  }, {
    "url": "windows11/SmallTile.scale-400.png",
    "revision": "efd13ea8ef20c3ea9368f60b77b68634"
  }, {
    "url": "windows11/Square150x150Logo.scale-100.png",
    "revision": "ab9a2739d0d37ea4be241cc48df58346"
  }, {
    "url": "windows11/Square150x150Logo.scale-125.png",
    "revision": "5532be25b0071d482d7283c174c6fd49"
  }, {
    "url": "windows11/Square150x150Logo.scale-150.png",
    "revision": "792e0be23a18dfe44f22164d8d2a59be"
  }, {
    "url": "windows11/Square150x150Logo.scale-200.png",
    "revision": "aecd61c491207271ac380b54a240e20b"
  }, {
    "url": "windows11/Square150x150Logo.scale-400.png",
    "revision": "3fd548f63905decac32075f9db210bed"
  }, {
    "url": "windows11/Wide310x150Logo.scale-100.png",
    "revision": "52a6d041f90137b029252ccdaa1dfa5e"
  }, {
    "url": "windows11/Wide310x150Logo.scale-125.png",
    "revision": "a39bbdf326180462f89f21fe807d2ef0"
  }, {
    "url": "windows11/Wide310x150Logo.scale-150.png",
    "revision": "1f9277e34cb5b5ed8f16eefdb310657e"
  }, {
    "url": "windows11/Wide310x150Logo.scale-200.png",
    "revision": "cac57db7cfcf7be2269d248ce9b3996c"
  }, {
    "url": "windows11/Wide310x150Logo.scale-400.png",
    "revision": "5da50789854cd7c9f666dd9af9112f95"
  }, {
    "url": "windows11/LargeTile.scale-100.png",
    "revision": "73d82b568578225e2658475d2c29e590"
  }, {
    "url": "windows11/LargeTile.scale-125.png",
    "revision": "e0b224d3f8b21f52b4fcd666e0d3e6d0"
  }, {
    "url": "windows11/LargeTile.scale-150.png",
    "revision": "fe55f2bab6b92a54298816adc51f0043"
  }, {
    "url": "windows11/LargeTile.scale-200.png",
    "revision": "2bcd56ca744b855f5111db7cb68b375a"
  }, {
    "url": "windows11/LargeTile.scale-400.png",
    "revision": "405b28b048848018ada4d8c7b416ea01"
  }, {
    "url": "windows11/Square44x44Logo.scale-100.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.scale-125.png",
    "revision": "e698c97314a72d406361bb1f267e8c3d"
  }, {
    "url": "windows11/Square44x44Logo.scale-150.png",
    "revision": "4e99c066e447d71c765a6e394c72de83"
  }, {
    "url": "windows11/Square44x44Logo.scale-200.png",
    "revision": "fe61b35091a06ff038c7e4c008bd412b"
  }, {
    "url": "windows11/Square44x44Logo.scale-400.png",
    "revision": "085ff58de86953a3ed589277af73d72d"
  }, {
    "url": "windows11/StoreLogo.scale-100.png",
    "revision": "ed4d3a8e6a7e25fad86096f16d03582d"
  }, {
    "url": "windows11/StoreLogo.scale-125.png",
    "revision": "0210305b1dc04b53c70449a2bb61f48c"
  }, {
    "url": "windows11/StoreLogo.scale-150.png",
    "revision": "44bbc9ebe2e2d5e205b447afd5f25771"
  }, {
    "url": "windows11/StoreLogo.scale-200.png",
    "revision": "9ffa9723edde4469d742547445fb354f"
  }, {
    "url": "windows11/StoreLogo.scale-400.png",
    "revision": "853fd2e182f2d4ea3cbdd816a9494c49"
  }, {
    "url": "windows11/SplashScreen.scale-100.png",
    "revision": "cac57db7cfcf7be2269d248ce9b3996c"
  }, {
    "url": "windows11/SplashScreen.scale-125.png",
    "revision": "73eb916f4f6576cc07904ca4a654d81b"
  }, {
    "url": "windows11/SplashScreen.scale-150.png",
    "revision": "f70733c22e38460802df1e46d63944be"
  }, {
    "url": "windows11/SplashScreen.scale-200.png",
    "revision": "5da50789854cd7c9f666dd9af9112f95"
  }, {
    "url": "windows11/SplashScreen.scale-400.png",
    "revision": "2afe26dab3669ef0f134b786139d69c6"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/Square44x44Logo.targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/Square44x44Logo.altform-unplated_targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-24.png",
    "revision": "9cef14c40087fce073d68b193d2b82ce"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-30.png",
    "revision": "ee4df2119a5530659d1644ca7dcbec60"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-36.png",
    "revision": "e3c00dec396194e2410bacf3d077c7c9"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-44.png",
    "revision": "ab474f7803f91795e9a1e35c2ebd201d"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "windows11/Square44x44Logo.altform-lightunplated_targetsize-256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "android/android-launchericon-512-512.png",
    "revision": "2bde476d8f73cff449c4c5f0cdb3f0b5"
  }, {
    "url": "android/android-launchericon-192-192.png",
    "revision": "1acc4e12128d42c364f10b19669ef329"
  }, {
    "url": "android/android-launchericon-144-144.png",
    "revision": "9a809efcf29d348f2a3bc097f96f995d"
  }, {
    "url": "android/android-launchericon-96-96.png",
    "revision": "cac678e465069477829ca9a46b8fcaf1"
  }, {
    "url": "android/android-launchericon-72-72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "android/android-launchericon-48-48.png",
    "revision": "0cdc837a81c8836f1d09fe76c4c7502e"
  }, {
    "url": "ios/16.png",
    "revision": "d39dc0c8337d17d8bd998f309ab99c0a"
  }, {
    "url": "ios/20.png",
    "revision": "0c3ce6ebfe701afb0d3234dbb77b4301"
  }, {
    "url": "ios/29.png",
    "revision": "9eca9d5cc5e05b51c4bbfbaf03a197fc"
  }, {
    "url": "ios/32.png",
    "revision": "2ec17b79418cd57ee459c934b6fc3797"
  }, {
    "url": "ios/40.png",
    "revision": "26679a934a835848d17adfe57a79cee8"
  }, {
    "url": "ios/50.png",
    "revision": "404441fe2ca139ff2f81a75a0469bd7d"
  }, {
    "url": "ios/57.png",
    "revision": "588ddabf6195f1e46fdc6ef1715bf23d"
  }, {
    "url": "ios/58.png",
    "revision": "e6433dfb9edb8d29385a7bc39389ea7d"
  }, {
    "url": "ios/60.png",
    "revision": "45459ef21b9201123e4e0ce1ebeccdd0"
  }, {
    "url": "ios/64.png",
    "revision": "f83be25ce8a24e85f1e87162f9e04145"
  }, {
    "url": "ios/72.png",
    "revision": "c2250a5dde93274a6ea8e57d61b43cb4"
  }, {
    "url": "ios/76.png",
    "revision": "c62fbb1b973e0545055894c6c5d287d4"
  }, {
    "url": "ios/80.png",
    "revision": "d66b29d89259d6dad32cc08e8a614bf5"
  }, {
    "url": "ios/87.png",
    "revision": "eefe24578d1b61e1fbc8a5e825ef52a7"
  }, {
    "url": "ios/100.png",
    "revision": "41310455f6bb716ebfa06476c3da9e0d"
  }, {
    "url": "ios/114.png",
    "revision": "649da24ed9a29c80c1bf4b94dccb6769"
  }, {
    "url": "ios/120.png",
    "revision": "ea067b199771aff32d7f2cfa89bc43c8"
  }, {
    "url": "ios/128.png",
    "revision": "9d63c3948bcf09d17d6f24139be66de6"
  }, {
    "url": "ios/144.png",
    "revision": "9a809efcf29d348f2a3bc097f96f995d"
  }, {
    "url": "ios/152.png",
    "revision": "b8aafdfaa7dde0703cc0f13a74ac60c5"
  }, {
    "url": "ios/167.png",
    "revision": "e5fe5b8d1e369262a57f4f33c59786ff"
  }, {
    "url": "ios/180.png",
    "revision": "31c64954e65a47fa18bbe6d41c957c96"
  }, {
    "url": "ios/192.png",
    "revision": "1acc4e12128d42c364f10b19669ef329"
  }, {
    "url": "ios/256.png",
    "revision": "a000aba4f39238500be13400b96cafc3"
  }, {
    "url": "ios/512.png",
    "revision": "2bde476d8f73cff449c4c5f0cdb3f0b5"
  }, {
    "url": "ios/1024.png",
    "revision": "d970c03e6b7e84d9e10f9af33f04db8e"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fcce0b63eae83800b4eee6fb9a6c2c8b"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute("/rest/v1/**", new workbox.NetworkFirst({
    "cacheName": "supabase-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');

}));
