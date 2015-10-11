"use strict";
/**
 * 
 * Shopify Javascript API
 * Retrieves ATOM feeds in expected Shopify format
 *
 * @version   1.1
 * @author    Mike DiDomizio
 * @website   http://mikedidomizio.com
 * @license   This software is licensed under the MIT license: http://opensource.org/licenses/MIT
 * @copyright Mike DiDomizio
 *
 */
class Shopify {
    website: string;
    /**
     * Constructor
     *
     * @param host|undefined    Domain to call, leaving empty will make local AJAX calls
     */
    constructor(public host: string) {
        this.website = host ? host.trim() : "";
    };
    /**
     * Makes an AJAX call to a feed url
     *
     * @param url               String  The endpoint URL to call
     * @param retrieveArray     Array   An array of keys of items that we will return
     * @returns Object
     */
    ajax(url: string, retrieveArray: Array<string>): Object {
        var self = this,
            itemsToRetrieve: Array<string> = retrieveArray instanceof Array ? retrieveArray : [];

        return new Promise(function(resolve, reject) {

            var feedURL:string = self.website + url.trim(),
                xmlnsS:string = "http://jadedpixel.com/-/spec/shopify";

            if(feedURL.slice(-4).toLowerCase() === 'json') {
                var dataType: string = "json"
            } else {
                var dataType: string = feedURL.match(/\&|\?callback\=\?/) ? 'jsonp' : 'xml';
            }

            var xmlHttp = new XMLHttpRequest();

            xmlHttp.onreadystatechange = function() {
                if (xmlHttp.readyState === 4) {
                    if(xmlHttp.status === 200) {

                        var data = xmlHttp.responseText,
                            obj = [];

                        //is it coming back in json format?
                        if(dataType == 'json') {

                            // convert it to an object
                            data = JSON.parse(data);

                            if(itemsToRetrieve.length > 0) {
                                var item: any = {};

                                for(var i in <any>data) {
                                    if(itemsToRetrieve.indexOf(i) != -1) {
                                        item[i] = data[i];
                                    }
                                }

                                obj.push(item);
                            } else {
                                obj.push(data);
                            }
                        } else {

                            //if it is a jsonp call, ensure that you know what data you'll be getting back
                            if(dataType === 'jsonp') {
                                var data:string = decodeURIComponent(data);
                            }

                            //there is always a chance for things to go bad with XML
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(data, "text/xml");

                            for(var i in <any>xmlDoc) {

                                try {

                                    if(typeof xmlDoc[i] == "object") {

                                        for(var j in <any>xmlDoc[i]) {

                                            if(typeof xmlDoc[i][j] === "string") {

                                                var dom = parser.parseFromString(xmlDoc[i][j], "text/xml");
                                                var entries = dom.documentElement.getElementsByTagName("entry");

                                                for(var e in <any>entries) {
                                                    if(entries[e].nodeName === "entry") {
                                                        var entry = entries[e];

                                                        var item: any = {};

                                                        item.title = entry.getElementsByTagName("title")[0].childNodes[0].nodeValue;
                                                        item.published = entry.getElementsByTagName("published")[0].childNodes[0].nodeValue;
                                                        item.updated = entry.getElementsByTagName("updated")[0].childNodes[0].nodeValue;

                                                        if(itemsToRetrieve.indexOf("summary") != -1) {
                                                            item.summary = entry.getElementsByTagName("summary")[0].childNodes[0].nodeValue;
                                                        }

                                                        var all = entry.getElementsByTagNameNS(xmlnsS,"*");

                                                        for(var i in all) {

                                                            switch(all[i].nodeName) {
                                                                case "s:tag" :
                                                                case "s:type" :
                                                                case "s:vendor" :

                                                                    if(all[i].firstChild.nodeValue != "" && (itemsToRetrieve.length == 0 || itemsToRetrieve.indexOf(all[i].nodeName) != -1)) {

                                                                        var tagName = all[i].tagName.match(/^s\:([\w]+)$/);

                                                                        if(all[i].nodeName == "s:vendor") {
                                                                            item[tagName[1]] = all[i].firstChild.nodeValue;
                                                                        }else {
                                                                            if(!item[tagName[1]]) {
                                                                                item[tagName[1]] = new Array();
                                                                            }

                                                                            item[tagName[1]].push(all[i].firstChild.nodeValue);
                                                                        }
                                                                    }
                                                                    break;
                                                                case "s:variant" :
                                                                    if(itemsToRetrieve.length == 0 || itemsToRetrieve.indexOf("s:variant") != -1) {
                                                                        var variant = {};

                                                                        if(typeof item.variant == "undefined") {
                                                                            item.variant = [];
                                                                        }

                                                                        for(var k = 1; k < 11; k += 2) {
                                                                            variant[all[i].childNodes[k].nodeName] = all[i].childNodes[k].nodeValue;
                                                                        }

                                                                        item.variant.push(variant);
                                                                    }
                                                                    break;
                                                            }
                                                        }

                                                        // Adds the item to the object
                                                        obj.push(item);
                                                    }
                                                }
                                            }
                                        }
                                    }

                                } catch(err) {
                                    // error occurred when trying to parse an entry
                                    // do not rejecr
                                    console.warn(err)
                                }
                            }
                        }

                        resolve(obj);
                    } else {
                        reject(xmlHttp.responseText);
                    }
                }
            }

            xmlHttp.open("GET", feedURL, true);
            xmlHttp.send(null);

        })
    }
}