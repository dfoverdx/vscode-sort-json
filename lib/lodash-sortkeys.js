var _ = require("lodash");

Array.prototype.move = function(old_index, new_index) {
    // Shortcut helper to move item to end of array
    if (-1 === new_index) {
        new_index = this.length - 1;
    }

    if (new_index >= this.length) {
        var k = new_index - this.length;
        while (k-- + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

function sortObjKeysByAlgorithm(sortAlgo, obj, order) {
    var asc = true;
    if (order !== undefined && order.length > 0) {
        asc = order[0] === "asc";
    }

    switch (sortAlgo) {
        case "keyLength":
            var keyLengths = _.map(_.keys(obj), function(x) {
                return { key: x, keyLength: x.length };
            });
            keyLengths = _.orderBy(keyLengths, ["keyLength"], order);
            return _.map(keyLengths, "key");

        case "alphaNum":
            return _.keys(obj).sort(function(a, b) {
                return (
                    a.localeCompare(b, "en", { numeric: true }) *
                    (asc ? 1 : -1)
                );
            });

        case "values":
            if (_.isArray(obj)) {
                return;
            }

            return _.keys(obj).sort(function(a, b) {
                var v1 = obj[a];
                var v2 = obj[b];

                if (_.isString(v1) && _.isString(v2)) {
                    var val =
                        v2.localeCompare(v1, "en", { numeric: true }) *
                        (asc ? 1 : -1);
                    return val;
                }

                if (_.isNumber(v1) && _.isNumber(v2)) {
                    var val = (v1 - v2) * (asc ? 1 : -1);
                    return val;
                }

                if (_.isNumber(v1) && _.isString(v2)) {
                    return -1;
                }

                if (_.isNumber(v2) && _.isString(v1)) {
                    return 1;
                }

                return -1;
            });

        case "type":
            return _.keys(obj).sort(function(a, b) {
                var v1 = obj[a];
                var v2 = obj[b];

                var t1 = 5;
                t1 = _.isNumber(v1) ? 1 : t1;
                t1 = _.isString(v1) ? 2 : t1;
                t1 = _.isArray(v1) ? 3 : t1;
                t1 = _.isObject(v1) ? 4 : t1;

                var t2 = 5;
                t2 = _.isNumber(v2) ? 1 : t2;
                t2 = _.isString(v2) ? 2 : t2;
                t2 = _.isArray(v2) ? 3 : t2;
                t2 = _.isObject(v2) ? 4 : t2;

                // If the same type then use alpbahetical (i.e. default sort json)
                if (t1 === t2) {
                    var val = a.localeCompare(b) * (asc ? 1 : -1);
                    return val;
                }

                var val = (t1 - t2) * (asc ? 1 : -1);
                return val;
            });

        default:
            return _.orderBy(_.keys(obj), [], order);
    }
}

_.mixin({
    sortKeysDeepBy: function(obj, order, options, sortAlgo) {
        order = order || ["asc"];

        if (_.isArray(obj)) {
            return _.map(obj, function(value) {
                if (
                    !_.isNumber(value) &&
                    !_.isFunction(value) &&
                    _.isObject(value)
                ) {
                    return _.sortKeysDeepBy(value, order, options, sortAlgo);
                } else {
                    return value;
                }
            });
        } else {
            var keys = sortObjKeysByAlgorithm(sortAlgo, obj, order);

            if (options && options.orderOverride) {
                var orderOverride = options.orderOverride.slice().reverse();
                orderOverride.forEach(function(key) {
                    if (/^\/.*\/[imgysu]*$/.test(key)) {
                        try {
                            key = eval(key);
                        } catch {}
                    }

                    var index;
                    var firstIdx = 0;
                    function findIndex(o) {
                        return key instanceof RegExp ? key.test(o) : o === key;
                    };

                    while ((index = _.findIndex(keys, findIndex, firstIdx)) !== -1) {
                        keys.move(index, 0);
                        firstIdx++;
                    }

                    // sort values matched by regex within their group
                    if (key instanceof RegExp) {
                        var tmpObj = _.pick(obj, keys.slice(0, firstIdx));
                        var tmpKeys = sortObjKeysByAlgorithm(sortAlgo, tmpObj, order);
                        keys.splice(0, tmpKeys.length, ...tmpKeys);
                    }
                });
            }

            if (options && options.orderUnderride) {
                var orderUnderride = options.orderUnderride.slice();
                orderUnderride.forEach(function(key) {
                    if (/^\/.*\/[imgysu]*$/.test(key)) {
                        try {
                            key = eval(key);
                        } catch {}
                    }

                    var index;
                    var lastIdx = keys.length;
                    function findIndex(o) {
                        return key instanceof RegExp ? key.test(o) : o === key;
                    };

                    while ((index = _.findIndex(keys.slice(0, lastIdx), findIndex)) !== -1) {
                        keys.move(index, -1);
                        lastIdx--;
                    }

                    // sort values matched by regex within their group
                    if (key instanceof RegExp) {
                        var tmpObj = _.pick(obj, keys.slice(lastIdx - 1));
                        var tmpKeys = sortObjKeysByAlgorithm(sortAlgo, tmpObj, order);

                        keys.splice(lastIdx, tmpKeys.length, ...tmpKeys);
                    }
                });
            }

            return _.zipObject(
                keys,
                _.map(keys, function(key) {
                    if (
                        !_.isNumber(obj[key]) &&
                        !_.isFunction(obj[key]) &&
                        _.isObject(obj[key])
                    ) {
                        obj[key] = _.sortKeysDeepBy(
                            obj[key],
                            order,
                            options,
                            sortAlgo
                        );
                    }
                    return obj[key];
                })
            );
        }
    }
});
