modules.require(['instagram', 'twitter', 'yafotki', 'yablogs'], function(instagram, twitter, yafotki, yablogs) {

    var fs = require('fs'),
        path = require('path'),
        vm = require('vm'),
        url = require('url'),
        querystring = require('querystring'),

        moment = require('moment'),
        vow = require('vow'),

        pathToBundle = path.join(__dirname, '..', '..', 'desktop.bundles', 'index');

    var bemtreeTemplate = fs.readFileSync(path.join(pathToBundle, 'index.bemtree.js'), 'utf-8'),
        BEMHTML = require(path.join(pathToBundle, 'index.bemhtml.js')).BEMHTML,
        context = vm.createContext({
            console: console,
            Vow: vow
        });

    vm.runInContext(bemtreeTemplate, context);
    var BEMTREE = context.BEMTREE;

    module.exports = function(req, res) {

        var dataEntries = [],
            searchObj = url.parse(req.url, true).query,
            queryString = querystring.escape(searchObj.query),
            servicesEnabled = [];

        searchObj.twitter && servicesEnabled.push(twitter.get(queryString));
        searchObj.instagram && servicesEnabled.push(instagram.get(queryString));
        searchObj.yafotki && servicesEnabled.push(yafotki.get(queryString));
        searchObj.yablogs && servicesEnabled.push(yablogs.get(queryString));

        vow.all(servicesEnabled)
            .then(function(results) {

                Object.keys(results).map(function(idx) {
                    dataEntries = dataEntries.concat(results[idx]);
                });

                dataEntries.sort(function(a, b) {
                    return b.createdAt.valueOf() - a.createdAt.valueOf();
                });

                BEMTREE
                    .apply(dataEntries.map(function(dataEntry) {
                        dataEntry.createdAt = moment(dataEntry.createdAt).fromNow();
                        return {
                            block: 'island',
                            data: dataEntry,
                            mods: { type: dataEntry.type }
                        };
                    }))
                    .then(function(bemjson) {
                        if (searchObj.json) {
                            return res.end(JSON.stringify(bemjson, '\n', 4));
                        }
                        res.end(BEMHTML.apply(bemjson));

                    });

            })
            .fail(function() {
                console.error(arguments);
            });
    };
});
