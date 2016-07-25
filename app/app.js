/* global angular, flotty */
'use strict';

var Latinise = {};
Latinise.latin_map = {"é": "e", "ä": "a", "á": "a", "ű": "u", "ő": "o", "ú": "u", "ö": "o", "ü": "u", "ó": "o", "í": "i", "É": "E", "Á": "A", "Ű": "U", "Ő": "O", "Ú": "U", "Ö": "O", "Ü": "U", "Ó": "O", "Í": "I"};
String.prototype.latinise = function () {
    return this.replace(/[^A-Za-z0-9\[\] ]/g, function (a) {
        return Latinise.latin_map[a] || a;
    });
};
String.prototype.latinize = String.prototype.latinise;
String.prototype.isLatin = function () {
    return this === this.latinise();
};

var app = angular.module('flotty', [
    'ngRoute',
    'ngSanitize',
    'flotty.version'
]);

app.config(['$routeProvider', '$httpProvider',
    function ($routeProvider, $httpProvider) {
        $routeProvider.
                when('/posts/create', {
                    templateUrl: 'partials/post-create.html',
                    controller: 'PostCreateCtrl'
                }).
                when('/posts', {
                    templateUrl: 'partials/post-list.html',
                    controller: 'PostListCtrl'
                }).
                otherwise({
                    redirectTo: '/posts'
                });
        $httpProvider.defaults.useXDomain = true;
    }]);

app.directive("contenteditable", function () {
    console.log("init contenteditable");
    return {
        require: "ngModel",
        link: function (scope, element, attrs, ngModel) {

            console.log("init link");

            function read() {
                ngModel.$setViewValue(element.html());
            }

            ngModel.$render = function () {
                element.html(ngModel.$viewValue || "");
            };

            element.bind("blur keyup change", function () {
                scope.$apply(read);
            });
        }
    };
});

app.factory('api', [
    function () {
        var api = {
            baseUrl: function () {
                return flotty.apiBaseUrl;
            },
            authHeader: function () {
                return 'Basic ' + window.btoa(flotty.apiUsername + ':' + flotty.apiPassword);
            }

        };
        return api;
    }]);

app.controller('NavigationCtrl', ['$scope', '$route',
    function ($scope, $route) {
        $scope.nav = {
            currentPage: null,
            search: {
                query: null,
                text: null,
                author: null,
                initParamsFromQuery: function () {
                    this.author = null;
                    this.text = null;
                    if (this.query) {
                        console.log("Query: " + this.query);
                        var tokens = this.query.match(/\S+/g);

                        var words = tokens.filter(function (word) {
                            return !word.startsWith("@");
                        });
                        this.text = words.join(" ");

                        var authors = tokens.filter(function (value) {
                            return value.startsWith("@");
                        });
                        var self = this;
                        angular.forEach(authors, function (value) {
                            self.author = value.substring(1);
                        });

                        console.log("author: " + this.author);
                        console.log("text: " + this.text);
                    }
                },
                initQueryFromParams: function (params) {
                    var q = "";
                    var paramsPresent = false;
                    if (params.text) {
                        if (paramsPresent) {
                            q = q + " ";
                        }
                        q = q + params.text;
                        paramsPresent = true;
                    }
                    if (params.author) {
                        if (paramsPresent) {
                            q = q + " ";
                        }
                        q = q + "@" + params.author;
                        paramsPresent = true;
                    }
                    this.query = q;
                },
                execute: function () {
                    this.initParamsFromQuery();
                    $route.updateParams({
                        page: null,
                        text: this.text,
                        author: this.author
                    });
                }
            },
            getURL: function (page, text, author) {
                var url = "#/posts?";
                var paramsPresent = false;
                if (text) {
                    if (paramsPresent) {
                        url = url + "&";
                    }
                    url = url + "text=" + text;
                    paramsPresent = true;
                }
                if (author) {
                    if (paramsPresent) {
                        url = url + "&";
                    }
                    url = url + "author=" + author;
                    paramsPresent = true;
                }
                if (page) {
                    if (paramsPresent) {
                        url = url + "&";
                    }
                    url = url + "page=" + page;
                    paramsPresent = true;
                }
                return url;
            },
            nextURL: function () {
                return this.getURL(this.currentPage + 1, this.search.text, this.search.author);
            },
            prevURL: function () {
                return this.getURL(this.currentPage - 1, this.search.text, this.search.author);
            },
            nextPage: function () {
                $route.updateParams({
                    page: this.currentPage + 1,
                    text: this.search.text || null,
                    author: this.search.author || null
                });
            },
            prevPage: function () {
                $route.updateParams({
                    page: this.currentPage - 1,
                    text: this.search.text || null,
                    author: this.search.author || null
                });
            }
        };
    }]);

app.controller('PostListCtrl', ['$scope', '$routeParams', '$http', 'api',
    function ($scope, $routeParams, $http, api) {
        console.log('PostListCtrl created, page: ' + $routeParams.page + ', text: ' + $routeParams.text + ', author: ' + $routeParams.author);

        $scope.nav.currentPage = $routeParams.page ? new Number($routeParams.page) : 1;
        $scope.nav.search.initQueryFromParams($routeParams);
        $scope.posts = [];

        $scope.loadCurrentPage = function () {
            console.log('loadCurrentPage ' + $scope.nav.currentPage);
            var url = api.baseUrl() + '/posts?page=' + $scope.nav.currentPage;
            var s = $scope.nav.search;
            if (s.text) {
                url = url + "&text=" + s.text;
            }
            if (s.author) {
                url = url + "&author=" + s.author;
            }
            console.log('loadCurrentPage calling REST API at: ' + url);
            $http.get(url, {headers: {'Authorization': api.authHeader()}})
                    .success(function (data) {
                        $scope.posts = data;
                        angular.forEach($scope.posts, function (post) {
                            post.html = marked(post.text);
                            post.authorImage = post.author.toLowerCase().latinize();
                        });
                    })
                    .error(function (data) {
                        console.log('GET posts API call error');
                    });
        };

        $scope.loadCurrentPage();
    }]);

app.controller('PostCreateCtrl', ['$scope', '$routeParams', '$http', '$route', '$location', 'api',
    function ($scope, $routeParams, $http, $route, $location, api) {
        $scope.parent = $routeParams.parent;
        $scope.text = "";
        $scope.author = "";

        $scope.submit = function () {
            console.log('submitting...');

            var url = api.baseUrl() + '/posts';
            $http.post(url,
                    {
                        text: toMarkdown($scope.text),
                        author: $scope.author,
                        parentId: $scope.parent
                    },
                    {headers: {'Authorization': api.authHeader()}})
                    .success(function (data) {
                        console.log('submit success');
                        $route.updateParams({
                            page: null,
                            text: null,
                            author: null
                        });
                        $location.path('/posts');
                    })
                    .error(function (data) {
                        if (data.errors) {
                            console.log('post submit error: ' + data.errors);
                        } else {
                            console.log('post submit error: ' + data.code + " / " + data.message);
                        }
                    });
        };

        $scope.loadParent = function () {
            console.log('loadParent ' + $scope.parent);
            var url = api.baseUrl() + '/posts/' + $scope.parent;
            console.log('calling REST API at: ' + url);
            $http.get(url, {headers: {'Authorization': api.authHeader()}})
                    .success(function (data) {
                        $scope.post = data;
                        $scope.post.html = marked(data.text);
                    })
                    .error(function (data) {
                        console.log('loadParent error');
                    });
        };
        // try load parent if any
        if ($scope.parent) {
            $scope.loadParent();
        }

        $scope.$on('$viewContentLoaded', function () {
            // config
            var options = {
                editor: document.getElementById('editor'),
                textarea: '<textarea id="editortext"  name="content" placeholder="Hozzászólás írása ide... Lehet formázni is!" ng-model="text"></textarea>',
                list: [
                    'insertimage', 'blockquote', 'h2', 'h3', 'p', 'code', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule',
                    'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
                ]
            };

            // create editor
            var pen = window.pen = new Pen(options);
            pen.focus();
        });
    }]);
