'use strict';

angular.module('bars.ctrl.main', [
    'bars.filters'
    ])
    .controller('MainBaseCtrl',
        ['$scope', '$stateParams', 'AuthService', 'api.models.account', 'api.models.user', 'foods', 'bar', 'accounts', 'user', 'account',
        function($scope, $stateParams, AuthService, Account, User, foods, bar, accounts, user, account) {
            $scope.bar = {
                id: $stateParams.bar,
                name: bar.name,
                accounts: accounts,
                search: '',
                foods: foods,
                active: 'index',
            };
            $scope.user = {
                infos: user,
                isAuthenticated: AuthService.isAuthenticated,
                logout: AuthService.logout,
                account: account
            };
            $scope.login = {
                username: '',
                password: ''
            };

            $scope.connexion = function (login) {
                $scope.loginError = false;
                $scope.inLogin = true;
                AuthService.login(login).then(
                    function(user) {
                        $scope.user.infos = User.me().then(function(user) {
                            $scope.user.infos = user;
                        });
                        $scope.user.account = Account.me().then(function(account) {
                            $scope.user.account = account;
                        });
                        $scope.login = {username: '', password: ''};
                        $scope.inLogin = false;
                    }, function() {
                        $scope.loginError = true;
                        $scope.login.password = '';
                        $scope.inLogin = false;
                    }
                );
            };
        }])
    .controller('MainFormCtrl',
        ['$scope', '$filter', 'api.models.food', 'api.services.action',
        function($scope, $filter, Food, APIAction) {
            $scope.query = {
                type: 'acheter',
                qty: 1,
                unit: null,
                name: '',
                hideAnalysis: false,
                hasError: false,
                errorMessage: ''
            };
            var analyse = function(qo) {
                $scope.query = {
                    type: '',
                    qty: 1,
                    unit: '',
                    name: '',
                    food: null,
                    account: null,
                    hasError: false,
                    errorMessage: ''
                };

                if(qo === "") {
                    return $scope.query;
                }
                // On découpe la requête en termes
                var terms = qo.split(' ');

                var types = [
                    'acheter',
                    'jeter',
                    'donner',
                    'amende',
                    'appro',
                ];

                var units = [
                    'g',
                    'cg',
                    'kg',
                    'l',
                    'ml',
                    'cl',
                ];

                var aQty = [];
                var aFoods = [];
                var aUnits = [];
                var aAccounts = [];

                function cleana() {
                    var i;
                    for (i = (aQty.length - 1); i >= 0; i--) {
                        if (aQty[i].used) {
                            aQty.splice(i, 1);
                        }
                    }
                    for (i = (aFoods.length - 1); i >= 0; i--) {
                        if (aFoods[i].used) {
                            aFoods.splice(i, 1);
                        }
                    }
                    for (i = (aUnits.length - 1); i >= 0; i--) {
                        if (aUnits[i].used) {
                            aUnits.splice(i, 1);
                        }
                    }
                    for (i = (aAccounts.length - 1); i >= 0; i--) {
                        if (aAccounts[i].used) {
                            aAccounts.splice(i, 1);
                        }
                    }
                }

                for (var i = 0; i < terms.length; i++) {
                    // Type
                    if (types.indexOf(terms[i]) > -1) {
                        $scope.query.type = terms[i];
                        continue;
                    }

                    var item = {
                        isQty: false,
                        isFood: false,
                        isUnit: false,
                        used: false
                    };

                    // Quantité
                    if (/^([0-9]+(((\.)|€|,|(euro(s?)))[0-9]+)?).*$/.test(terms[i])) {
                        item.qty = terms[i].replace(/^([0-9]+(((\.)|€|,|(euro(s?)))[0-9]+)?).*$/g, '$1').replace('/,/', '.').replace(/€/, '.').replace(/euros?/, '.');
                        item.isQty = true;
                    }

                    // Unité
                    if (units.indexOf(terms[i]) > -1) {
                        item.isUnit = true;
                        item.unit = terms[i];
                        aUnits.push(item);
                    } else {
                        var unit = terms[i].replace(/^([0-9]+(((\.)|€|,|(euro(s?)))[0-9]+)?)(.*)$/g, '$7');
                        if (unit != terms[i] && units.indexOf(unit) > -1) {
                            var itemu = {
                                isQty: false,
                                isFood: false,
                                isUnit: false,
                                used: false
                            };
                            itemu.isUnit = true;
                            itemu.unit = unit;
                            aUnits.push(itemu);
                        }
                    }

                    // Food
                    var foods = $filter('filter')($scope.bar.foods, function (o) {
                        return (!o.deleted && (o.name.toLocaleLowerCase().indexOf(terms[i].toLocaleLowerCase()) > -1 ||
                            o.keywords.toLocaleLowerCase().indexOf(terms[i].toLocaleLowerCase()) > -1));
                    }, false);
                    if (foods.length === 0) {
                        foods = $filter('filter')($scope.bar.foods, function (o) {
                            return (!o.deleted && (o.name.toLocaleLowerCase().indexOf(terms[i].toLocaleLowerCase().replace(/s$/, '')) > -1 ||
                                o.keywords.toLocaleLowerCase().indexOf(terms[i].toLocaleLowerCase().replace(/s$/, '')) > -1));
                        }, false);
                    }
                    if (foods.length == 1) {
                        item.isFood = true;
                        item.food = foods[0];
                    }

                    // Push food et quantité
                    if (item.isQty) {
                        aQty.push(item);
                    }
                    if (item.isFood) {
                        aFoods.push(item);
                    }

                    // Account
                    var accounts = $filter('filter')($scope.bar.accounts, function (o) {
                        return (o.owner.name.toLocaleLowerCase().indexOf(terms[i].toLocaleLowerCase()) > -1);
                    }, false);
                    if (accounts.length == 1) {
                        aAccounts.push(accounts[0]);
                    }
                }

                function analyseTerms() {
                    // Réflexion et exécution
                    if (aFoods.length == 1) {
                        aFoods[0].used = true;
                        $scope.query.food = aFoods[0].food;
                        if ($scope.query.type === '') {
                            $scope.query.type = 'acheter';
                        }
                        cleana();
                    }
                    if (aAccounts.length == 1) {
                        $scope.query.account = aAccounts[0];
                        aAccounts[0].used = true;
                        if ($scope.query.type === '') {
                            $scope.query.type = 'donner';
                        }
                        cleana();
                    }
                    if (aQty.length == 1) {
                        $scope.query.qty = aQty[0].qty;
                        aQty[0].used = true;
                        cleana();
                        if (aUnits.length == 1 && $scope.query.food !== null) {
                            $scope.query.unit = aUnits[0].unit;
                            aUnits[0].used = true;
                            cleana();
                            if ((/^k/i.test($scope.query.food.unit) && !/^k/i.test($scope.query.unit)) || (!/^m/i.test($scope.query.food.unit) && /^m/i.test($scope.query.unit))) {
                                $scope.query.qty *= 0.001;
                            } else if ((!/^k/i.test($scope.query.food.unit) && /^k/i.test($scope.query.unit)) || (/^m/i.test($scope.query.food.unit) && !/^m/i.test($scope.query.unit))) {
                                $scope.query.qty *= 1000;
                            } else if (/^c/i.test($scope.query.food.unit) && !/^c/i.test($scope.query.unit)) {
                                $scope.query.qty *= 100;
                            } else if (!/^c/i.test($scope.query.food.unit) && /^c/i.test($scope.query.unit)) {
                                $scope.query.qty *= 0.01;
                            }
                        }
                    }
                    if ($scope.query.food !== null) {
                        $scope.query.unit = $scope.query.food.unit;
                    }
                }

                // 3 analyses car une analyse peut permettre de supprimer un des aliments qui serait la seule quantité et passer ainsi à un seul aliment
                analyseTerms();
                analyseTerms();
                analyseTerms();

                // Erreurs
                if ($scope.query.type == 'acheter' || $scope.query.type == 'jeter' || $scope.query.type == 'appro') {
                    if ($scope.query.food === null) {
                        $scope.query.hasError = true;
                        $scope.query.errorMessage = "Cet aliment n'existe pas dans ce bar.";
                    }
                }
                if ($scope.query.type == 'donner' || $scope.query.type == 'amende') {
                    if ($scope.query.account === null) {
                        $scope.query.hasError = true;
                        $scope.query.errorMessage = "Aucun utilisateur à ce nom dans ce bar.";
                    }
                }
                if ($scope.query.type == 'donner') {
                    if ($scope.query.account !== null && $scope.user.account.id == $scope.query.account.id) {
                        $scope.query.hideAnalysis = true;
                        $scope.query.hasError = true;
                        $scope.query.errorMessage = "Réfléchis mon grand ! On ne peut pas se faire de don à soi-même !";
                    }
                    if ($scope.query.qty <= 0) {
                        $scope.query.hideAnalysis = true;
                        $scope.query.hasError = true;
                        $scope.query.errorMessage = "On ne peut donner que des montants strictement positifs.";
                    }
                }

                return $scope.query;
            };

            $scope.$watch('bar.search', analyse);

            $scope.executeQuery = function() {
                if ($scope.query.food === null && $scope.query.account === null) {
                    return;
                }
                var type = $scope.query.type;
                type = {'acheter': 'buy', 'jeter': 'throw', 'donner': 'give', 'amende': 'punish', 'appro': 'appro'}[type]; // Use correct names

                if(_.contains(['buy', 'throw', 'give', 'punish', 'appro'], type)) {
                    if (!$scope.query.hasError) {
                        var req;
                        if(_.contains(['buy', 'throw', 'appro'], type)) {
                            req = {item: $scope.query.food.id, qty: $scope.query.qty};
                        } else {
                            req = {account: $scope.query.account.id, amount: $scope.query.qty};
                        }
                        APIAction[type](req).then(function() {
                            $scope.bar.search = '';
                        });
                    }
                }
            };
        }])
    .controller(
        'MainBarCtrl',
        ['$scope', function($scope) {
            $scope.bar.active = 'index';
            document.getElementById("queryf").focus();
        }])
;
