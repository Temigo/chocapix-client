'use strict';

angular.module('bars.admin.account', [

])
.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state('bar.admin.account', {
        url: '/account',
        abstract: true,
        template: "<ui-view />",
        controller: 'admin.ctrl.account'
    })
        .state('bar.admin.account.add', {
            url: '/add',
            templateUrl: "components/admin/account/add.html",
            controller: 'admin.ctrl.account.add'
        })
        .state('bar.admin.account.import', {
            url: '/import',
            templateUrl: "components/admin/account/import.html",
            controller: 'admin.ctrl.account.import'
        })
        .state('bar.admin.account.link', {
            url: '/link',
            templateUrl: "components/admin/account/link.html",
            controller: 'admin.ctrl.account.link',
            resolve: {
                user_list: ['api.models.user', function(User) {
                    return User.all();
                }]
            }
        })
        .state('bar.admin.account.collectivePayment', {
            url: '/fist',
            templateUrl: "components/admin/account/collectivePayment.html",
            controller: 'admin.ctrl.account.collectivePayment',
            resolve: {
                account_list: ['api.models.account', function(Account) {
                    return Account.all();
                }]
            }
        })
    ;
}])

.controller('admin.ctrl.account',
    ['$scope',
    function($scope) {
        $scope.admin.active = 'account';
    }
])
.controller('admin.ctrl.account.add',
    ['$scope', 'api.models.account', 'api.models.user', 'api.services.action', '$state',
    function($scope, Account, User, APIAction, $state) {
        $scope.admin.active = 'account';
        $scope.nuser = User.create();
        $scope.nuser.lastname = "";
        $scope.nuser.firstname = "";
        $scope.nuser.password = "";
        $scope.nuser.passwordBis = "";
        $scope.nuser.username = "";
        $scope.nuser.pseudo = "";
        $scope.naccount = Account.create();
        $scope.naccount.amoney = 0;
        $scope.isValidUser = function() {
            var lastnameTest = $scope.nuser.lastname && $scope.nuser.lastname.length > 0;
            var firstnameTest = $scope.nuser.firstname && $scope.nuser.firstname.length > 0;
            var usernameTest = $scope.nuser.username.length > 0;
            var pwdTest = $scope.nuser.passwordBis && $scope.nuser.password.length > 0 && $scope.nuser.password == $scope.nuser.passwordBis;
            var moneyTest = $scope.naccount.amoney !== '' && $scope.naccount.amoney >= 0;
            return lastnameTest && firstnameTest && usernameTest && pwdTest && moneyTest;
        };
        $scope.createAccount = function() {
            if ($scope.nuser.password == $scope.nuser.passwordBis) {
                $scope.nuser.firstname = _.capitalize(_.trim($scope.nuser.firstname));
                $scope.nuser.lastname = _.trim($scope.nuser.lastname);
                delete $scope.nuser.passwordBis;
                $scope.nuser.$save().then(function(u) {
                    $scope.naccount.owner = u.id;
                    $scope.amoney = $scope.naccount.amoney;
                    delete $scope.naccount.amoney;
                    $scope.naccount.$save().then(function(a) {
                        if ($scope.amoney > 0) {
                            APIAction.deposit({account: a.id, amount: $scope.amoney}).then(function() {
                                $state.go('bar.account.details', {id: a.id});
                            }, function(errors) {
                                console.log("Erreur dépôt chèque.")
                            });
                        } else {
                            $state.go('bar.account.details', {id: a.id});
                        }
                    }, function(errors) {
                        console.log("Erreur création Account.");
                    });
                }, function(errors) {
                    console.log("Erreur création User.");
                });
            } else {
                $scope.password = '';
                $scope.passwordBis = '';
                console.log("Mots de passe différents");
            }

        }
    }
])
.controller('admin.ctrl.account.import',
    ['$scope', 'api.models.account', 'api.models.user', 'api.services.action', '$state',
    function($scope, Account, User, APIAction, $state) {
        $scope.admin.active = 'account';
        $scope.lista = "";
        $scope.oa = [];
        $scope.$watch('lista', function () {
            if (JSON.parse($scope.lista)) {
                $scope.oa = JSON.parse($scope.lista);
            }
        });
        $scope.importAccounts = function() {
            _.forEach($scope.oa, function (ouser) {
                var nuser = User.create();
                nuser.firstname = _.capitalize(_.trim(ouser.firstname));
                nuser.lastname = _.trim(ouser.lastname);
                nuser.email = ouser.email;
                nuser.username = ouser.login;
                nuser.$save().then(function(u) {
                    var naccount = Account.create();
                    naccount.owner = u.id;
                    //naccount.money = ouser.money;
                    naccount.$save().then(function(a) {
                        if (ouser.money > 0) {
                            APIAction.deposit({account: a.id, amount: ouser.money});
                        } else if (ouser.money < 0) {
                            APIAction.punish({account: a.id, amount: -ouser.money, motive: "Création du compte"});
                        }
                    });
                });
            });
        };
    }
])
.controller('admin.ctrl.account.link',
    ['$scope', 'api.models.account', 'api.models.user', 'api.services.action', 'user_list', '$state',
    function($scope, Account, User, APIAction, user_list, $state) {
        $scope.admin.active = 'account';
        var users_list = _.filter(user_list, function(n) {
            return n.username != 'bar';
        });
        $scope.users_list = users_list;
        $scope.user = null;
        $scope.findUser = function(usr) {
            $scope.user = usr;
        }
        $scope.account = Account.create();
        $scope.money = 0;
        $scope.createAccount = function(usr) {
            $scope.account.owner = $scope.user.id;
            $scope.account.$save().then(function(account) {
                APIAction.deposit({account: account.id, amount: $scope.money}).then(function() {
                    $state.go('bar.account.details', {id: account.id});
                }, function(errors) {
                    console.log('Erreur dépôt chèque.')
                });
            }, function(errors) {
                console.log('Erreur création Account.');
                // [TODO] Form error
            });
        }
    }
])
.controller('admin.ctrl.account.collectivePayment',
    ['$scope', 'api.services.action', 'account_list',
    function($scope, APIAction, account_list) {
        $scope.admin.active = 'account';
        $scope.account_list = _.filter(account_list, function(a) { return a.owner.is_active && !a.deleted; });
        $scope.account_list = _.forEach($scope.account_list, function(a) { a.pay = true; });
        $scope.list_order = 'owner.lastname';
        $scope.reverse = false;
        $scope.searchl = "";
        $scope.filterAccounts = function(o) {
            return o.filter($scope.searchl);
        };
        $scope.allSelected = true;
        $scope.toggleAll = function () {
            $scope.allSelected = !$scope.allSelected;
            _.map($scope.account_list, function (o) {
                o.pay = $scope.allSelected;
            });
        };
        $scope.collectivePay = function () {
            var accounts = _.map(_.filter($scope.account_list, function (a) {
                return a.pay;
            }), function (a) {
                return {account: a, ratio: 1};
            });
            APIAction.collectivePayment({accounts: accounts, amount: $scope.amount, motive: $scope.motive}).then(function () {
                $scope.amount = 0;
                $scope.motive = "";
                $scope.allSelected = true;
                _.map($scope.account_list, function (o) {
                    o.pay = false;
                });
            })
        };
    }
])
