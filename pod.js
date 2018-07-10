/*
 * Pod
 * AngularJS [P]lugin [O]riented [D]evelopment Framework
 * 
 * @author smakalande
 * @version 1.0
 * 
 */

let POD_DEBUG = false;

angular.module('pod', [])

.factory('constants', function() {
    return {
        paramPrefix: 'pod-param-',
        targetElement: 'pod-target',
        podName: 'podName',
        podType: 'podType',
        args: 'podArgs',
        postFunc: 'podPost',
        podSort: 'podSort'
    };
})

.factory('utils', function() {
    return {
        toSpinalCase: function(camelCaseString) {
            return camelCaseString.replace(/([^A-Z])([A-Z])/g, '$1-$2').toLowerCase();
        }
    };
})

.factory('$podLink', ['utils', 'constants','$rootScope', '$stateRegistry', function(utils, constants, $rootScope, $stateRegistry) {

    let link = {
        states: []
    };

    function getLinkEntry(moduleLink, type, key) {
        let keySegments = key.split('.');
        if(keySegments.length >= 1) {
            let s1 = keySegments[0];
            if(keySegments.length >= 2) {
                let s2 = keySegments[1];
                if(link[s1]) {
                    return link[s1][type][adjust(s2, true)];
                }
            } else {
                return moduleLink[type][s1] || moduleLink[type][adjust(s1, true)];
            }
        }
    }

    function adjust(key, isGlobal) {
        return isGlobal ? '+' + key : key;
    }

    return {
        register: function(moduleName) {

            link[moduleName] = {
                data: {},
                subjects: {}
            };

            let moduleLink = link[moduleName];

            return {
                data: {
                    set: function(key, value, isGlobal) {
                        key = adjust(key, isGlobal);
                        moduleLink.data[key] = value;
                    },
                    get: function(key) {
                        return getLinkEntry(moduleLink, 'data', key);
                    }
                },
                cache: {
                    set: function(key, value) {
                        localStorage.setItem(key, value);
                    },
                    get: function(key) {
                        return localStorage.getItem(key);
                    }
                },
                events: {
                    pub: function(event, data) {
                        $rootScope.$broadcast(moduleName + '.' + event, data);
                    },
                    sub: function(event, callback, myScope) {
                        let scope = myScope || $rootScope;
                        let eventSegments = event.split('.');
                        if(eventSegments.length >= 2) {
                            scope.$on(event, callback);
                        } else {
                            scope.$on(moduleName + '.' + event, callback);
                        }
                    }
                },
                subjects: {
                    new: function(key, initialValue, isGlobal) {
                        key = adjust(key, isGlobal);
                        moduleLink.subjects[key] = new Rx.BehaviorSubject(initialValue ? initialValue : null);
                        return moduleLink.subjects[key];
                    },
                    next: function(key, next) {
                        let subject = getLinkEntry(moduleLink, 'subjects', key);
                        if(subject) {
                            subject.next(next);
                        }
                    },
                    sub: function(key, next, controller, error, complete) {
                        let subject = getLinkEntry(moduleLink, 'subjects', key);

                        if(subject) {
                            let nextToJS = function(data) {
                                next(data ? data : null);
                            };
                            let subscription = subject.subscribe(nextToJS, error, complete);

                            POD_DEBUG && console.log('Subscribing to [' + key + ']:', controller);
                            if(controller) {
                            	
                            	if(controller.$on) {
                            		controller.$on("$destroy", function() {
                            			POD_DEBUG && console.log('Unsubscribing to [' + key + ']:', controller);
                                        subscription.unsubscribe();
                            	    });
                            	} else {
                            		controller.$onDestroy = function() {
                            			POD_DEBUG && console.log('Unsubscribing to [' + key + ']:', controller);
                                        subscription.unsubscribe();
                                    };
                            	}

                            }

                            return subscription;
                        }
                    }
                },
                state: {
                    add: function(state, stateDef, isShared) {

                        if(isShared) {
                            link.states.map(s => {
                                $stateRegistry.register(angular.extend({}, stateDef, {
                                    name: s.state + '.' + state
                                }));
                                link.states.push({
                                    state: s.state + '.' + state,
                                    isShared: false
                                });
                            });
                        }

                        function setSharedChildStates(parentState, maxLevels, currentLevel) {
                            let level = currentLevel || 0;
                            link.states.filter(s => s.isShared).map(s => {
                                let newState = parentState + '.' + s.state;
                                if(parentState.indexOf(s.state) === -1 && link.states.filter(s => s.state === newState).length === 0) {
                                    $stateRegistry.register(angular.extend({}, s.def, {
                                        name: parentState + '.' + s.state
                                    }));
                                    link.states.push({
                                        state: parentState + '.' + s.state,
                                        isShared: false
                                    });
                                    if(level < maxLevels) {
                                        level++;
                                        setSharedChildStates(newState, maxLevels, level);
                                    }
                                }
                                
                            });
                        };

                        setSharedChildStates(state, 1)

                        $stateRegistry.register(angular.extend({}, stateDef, {
                            name: state
                        }));

                        if(isShared) {
                            link.states.push({
                                state: state,
                                isShared: true,
                                def: stateDef
                            });
                        } else {
                            link.states.push({
                                state: state,
                                isShared: false
                            });
                        }
                        
                        POD_DEBUG && console.log(link.states);
                    }
                }
            };
        }
    };
}])

.factory('$pod', ['utils', 'constants', function(utils, constants) {

    let registry;

    return {
        init: function (app, pluginModules) {
            registry = {};

            let allModules = app.requires.concat([app.name]);
            
            for(moduleName of allModules) {
                let allComponents = angular.module(moduleName)._invokeQueue.filter(item => 'component' === item[1]);
                
                for(comp of allComponents) {
                    let podType = comp[2][1][constants.podType];
                    if(podType) {
                        registry[podType] = registry[podType] || [];
                        registry[podType].push(angular.extend({}, comp[2][1][constants.args], {
                            name: comp[2][0],
                            sort: comp[2][1][constants.podSort] || 0
                        }));
                    }
                }
            }
        },
        getRegistry: function() {
            return registry;
        },
        getRegisteredComponents: function(podType, podName) {
            if(podName) {
                return registry[podType].filter(comp => comp.name === podName);
            } else {
                return registry[podType];
            }
        },
        loadStyleUrls: function(styleUrls) {
            for(url of styleUrls) {
                var link = document.createElement("link");
                link.type = "text/css";
                link.rel = "stylesheet";
                link.href = url;
                document.getElementsByTagName("head")[0].appendChild(link);
            }
        }
    };
}])

.directive('pod', ['$compile', '$pod', 'constants', 'utils', function($compile, $pod, constants, utils) {

    function load(scope, element, attrs, ctrl, transclude) {
        let availableComponents = $pod.getRegisteredComponents(scope[constants.podType]);

        if(scope[constants.podName] !== undefined) {
            availableComponents = availableComponents.filter(component => component.name === scope[constants.podName]);
        }

        if(!availableComponents) {
            return;
        }

        availableComponents.sort(function(componentA, componentB) {
            return componentA.sort > componentB.sort;
        });

        let attributeString = '';
        for (let attributeName in attrs) {
            let spinalAttributeName = utils.toSpinalCase(attributeName);
            if (attrs.hasOwnProperty(attributeName) && spinalAttributeName.startsWith(constants.paramPrefix)) {
                attributeString += ' ' + spinalAttributeName.substring(constants.paramPrefix.length, spinalAttributeName.length) + '="' + attrs[attributeName] + '"';
            }
        }

        element.empty();

        availableComponents.forEach(function(component, index) {
            let template = '<' + utils.toSpinalCase(component.name) + attributeString + ' />';

            let compiled = $compile(template)(scope.$parent);

            transclude(function(transcludeElements, transcludeScope) {

                transcludeScope.pod = component;
                transcludeScope.pod.index = index;

                let targetElement = transcludeElements.find(constants.targetElement);

                if(targetElement.length === 1) {
                    targetElement.replaceWith(compiled);
                    element.append(transcludeElements);
                } else {
                    element.append(compiled);
                }

                if(scope[constants.postFunc] !== undefined) {
                    scope[constants.postFunc](transcludeScope.pod);
                }

            });
        });

    }

    let scopeBindings = {};
    scopeBindings[constants.podType] = '=';
    scopeBindings[constants.podName] = '=';
    scopeBindings[constants.postFunc] = '=';

    return {
        restrict: 'E',
        scope: scopeBindings,
        transclude: true,
        link: function(scope, element, attrs, ctrl, transclude) {

            load(scope, element, attrs, ctrl, transclude);

            if(scope[constants.podName] !== undefined) {
                scope.$watch(constants.podName, function(newValue, oldValue) {
                    if (newValue !== undefined && oldValue !== newValue) {
                        load(scope, element, attrs, ctrl, transclude);
                    }
                });
            }
  
        }
    };
}]);
