/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 11/3/2015
 * Time: 9:14 AM
 */

DOMAIN_BASE_PATH = '/threadpool.js/';
CLOSURE_BASE_PATH = DOMAIN_BASE_PATH + 'bower_components/google-closure-library/closure/goog/';
SRC_BASE_PATH = DOMAIN_BASE_PATH + '/test/';
importScripts(
  CLOSURE_BASE_PATH + 'bootstrap/webworkers.js',
  CLOSURE_BASE_PATH + 'base.js',
  CLOSURE_BASE_PATH + 'deps.js',
  DOMAIN_BASE_PATH + 'bower_components/utils.js/utils.js'
);

// optionally add importScripts('deps.js'); for current project dependencies
// add here goog.require(...)

u.log.VERBOSE = 'info';

importScripts(SRC_BASE_PATH + 'mock.js');

importScripts(DOMAIN_BASE_PATH + 'src/worker/thread.js');
