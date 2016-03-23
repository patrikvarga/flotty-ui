/* global angular */
'use strict';

var app = angular.module('flotty', [
    'ngRoute',
    'ngSanitize',
    'flotty.version'
]);

app.config(['$routeProvider', function ($routeProvider) {
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

app.controller('PostListCtrl', ['$scope', '$routeParams', '$http',
    function ($scope, $routeParams, $http) {
        console.log('PostListCtrl created, page: ' + $routeParams.page + ', text: ' + $routeParams.text + ', author: ' + $routeParams.author);

        $scope.nav.currentPage = $routeParams.page ? new Number($routeParams.page) : 1;
        $scope.nav.search.initQueryFromParams($routeParams);
        $scope.posts = [];

        $scope.loadCurrentPage = function () {
            console.log('loadCurrentPage ' + $scope.nav.currentPage);
            var url = 'http://localhost:8080/posts?page=' + $scope.nav.currentPage;
            var s = $scope.nav.search;
            if (s.text) {
                url = url + "&text=" + s.text;
            }
            if (s.author) {
                url = url + "&author=" + s.author;
            }
            console.log('calling REST API at: ' + url);
            $http.get(url).success(function (data) {
                $scope.posts = data;
                angular.forEach($scope.posts, function (post) {
                    post.html = marked(post.text);
                });
            }).error(function (data) {
                console.log('API call error');
            });
        };
        $scope.loadCurrentPage();
    }]);

app.controller('PostCreateCtrl', ['$scope', '$routeParams', '$http', '$route', '$location',
    function ($scope, $routeParams, $http, $route, $location) {
        $scope.parent = $routeParams.parent;
        $scope.text = "";
        $scope.author = "";

        $scope.submit = function () {
            console.log('submit: ' + $scope.text);
            var url = 'http://localhost:8080/posts';
            $http.post(url, {
                text: $scope.text,
                author: $scope.author,
                parentId: $scope.parent
            }).success(function (data) {
                console.log('submit success');
                $route.updateParams({
                    page: null,
                    text: null,
                    author: null
                });
                $location.path('/posts');
            }).error(function (data) {
                console.log('post submit error');
            });
        };

        $scope.loadParent = function () {
            console.log('loadParent ' + $scope.parent);
            var url = 'http://localhost:8080/posts/' + $scope.parent;
            console.log('calling REST API at: ' + url);
            $http.get(url).success(function (data) {
                $scope.post = data;
                $scope.post.html = marked(data.text);
            }).error(function (data) {
                console.log('loadParent error');
            });
        };
        // try load parent if any
        if ($scope.parent) {
            $scope.loadParent();
        }
    }]);
