Windwalker tests
===============

Requirements
------------

 * Mocha - http://visionmedia.github.com/mocha/
   Used to drive the test runs
   You can install globally using ```npm install -g mocha```
 * ImageMagick - http://www.imagemagick.org
   Compare tool is used to perform image comparison

Preparation
-----------

Edit configuration settings in the test environment configuration
../config/environments/test.js -- 

Execution
---------

once database is configured, run the tests with expresso:

```
cd ..
mocha -u tdd test/unit/windwalker.test.js
mocha -u tdd test/unit/render_cache.test.js
mocha -u tdd test/acceptance/server.js
```

Notes
-----
 * mocha might be installed in ../node_modules/mocha/bin
 * performance tests are currently broken. Need removal or fixing.
