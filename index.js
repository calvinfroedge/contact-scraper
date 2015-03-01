module.exports = function(){
    //TODO: Handle .jpg, .png extensions
    //Handle mailto: in links
    var REGEX_EMAIL = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    var REGEX_TWITTER_HANDLE = /(twitter.com\/\w{1,15}|@(?!\w{1,15}\.)\w{1,15})/;

    var Crawler = require("crawler");
    var url = require('url');

    var that = {
        crawl: function(url, finishedCallback){
            if(!url) throw new Error("URL is not defined.");

            var found = {
                emails: [],
                twitterHandles: []
            }

            var host = that.extractor.host(url);

            var visitedURLs = {length: 0};

            if(!finishedCallback) finishedCallback = function(result){ console.log(result);}

            var timeout;

            var c = new Crawler({
                maxConnections : 100,
                // This will be called for each crawled page
                callback : function (error, result, $) {
                    // $ is Cheerio by default
                    //a lean implementation of core jQuery designed specifically for the server
                    if(!$) return;
                    var links = $('a');
                    if(!links) return;

                    var foundEmails = that.extractor.emails(result.body);
                    foundEmails.map(function(email){
                        if(found.emails.indexOf(email) == -1){
                            found.emails.push(email);
                        }
                    });

                    var foundHandles = that.extractor.twitterHandles(result.body);
                    foundHandles.map(function(handle){
                        if(found.twitterHandles.indexOf(handle) == -1){
                            found.twitterHandles.push(handle);
                        }
                    });

                    links.each(function(index, a) {
                        var toQueueURL = $(a).attr('href');
                        if(!toQueueURL) {
                            return;
                        }

                        if(
                            toQueueURL.indexOf(host) != -1
                            && toQueueURL[0] != '/'
                            && !visitedURLs[toQueueURL]
                        ){
                            visitedURLs[toQueueURL] = 1;
                            c.queue(toQueueURL);
                            console.log('queueing', toQueueURL);

                            if(timeout) clearTimeout(timeout);
                        } else {
                            if(timeout) clearTimeout(timeout);
                            timeout = setTimeout(function(){
                                console.log("FINISHED");
                                console.log("VISITED", visitedURLs);
                                finishedCallback(found);
                            }, 15000);
                            console.log('skipping url', toQueueURL);
                        }
                    });
                }
            });
            visitedURLs[url] = 1;
            c.queue(url);
        },

        extractor: {
            host: function(url){
                var endOfProt = url.indexOf('://');
                var host;
                var withoutProt;
                var prot = '';

                if(endOfProt != -1){
                    withoutProt = url.substr(endOfProt+3).split('/');
                    prot = url.substr(0, endOfProt);
                } else {
                    withoutProt = url.spilt('/');
                }

                if(!withoutProt.length) throw new Error("URL is not defined.");
                host = withoutProt[0].replace('www.', '');

                return host;
            },
            filterDuplicates: function(matches){
                var keys = {};
                matches.map(function(match){
                    keys[match] = true;
                });
                return Object.keys(keys);
            },
            emails: function(text){
                //Get matches and return duplicates
                var matches = text.match(REGEX_EMAIL);
                if(!matches) return [];

                return that.extractor.filterDuplicates(matches);
            },
            twitterHandles: function(text){
                var matches = text.match(REGEX_TWITTER_HANDLE);
                if(!matches) return [];

                var filtered = that.extractor.filterDuplicates(matches);

                var ignore = ['twitter.com/intent'];

                ignore.map(function(i){
                    if(filtered.indexOf(i) != -1){
                        filtered.splice(i, 1);
                    }
                });

                return filtered;
            }
        }
    }

    return that;
}
