/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

(function (document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // Sets app default base URL
  app.baseUrl = '/';
  if (window.location.port === '') { // if production
    // Uncomment app.baseURL below and
    // set app.baseURL to '/your-pathname/' if running from folder in production
    // app.baseUrl = '/polymer-starter-kit/';
  }

  app.displayInstalledToast = function () {
    // Check to make sure caching is actually enabled—it won't be in the dev environment.
    if (!Polymer.dom(document).querySelector('platinum-sw-cache').disabled) {
      Polymer.dom(document).querySelector('#caching-complete').show();
    }
  };

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function () {
    app.configElementsBehavior();
  });

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function () {
    // imports are loaded and elements have been registered
  });

  // Main area's paper-scroll-header-panel custom condensing transformation of
  // the appName in the middle-container and the bottom title in the bottom-container.
  // The appName is moved to top and shrunk on condensing. The bottom sub title
  // is shrunk to nothing on condensing.
  window.addEventListener('paper-header-transform', function (e) {
    var appName = Polymer.dom(document).querySelector('#mainToolbar .app-name');
    var middleContainer = Polymer.dom(document).querySelector('#mainToolbar .middle-container');
    var bottomContainer = Polymer.dom(document).querySelector('#mainToolbar .bottom-container');
    var detail = e.detail;
    var heightDiff = detail.height - detail.condensedHeight;
    var yRatio = Math.min(1, detail.y / heightDiff);
    // appName max size when condensed. The smaller the number the smaller the condensed size.
    var maxMiddleScale = 0.50;
    var auxHeight = heightDiff - detail.y;
    var auxScale = heightDiff / (1 - maxMiddleScale);
    var scaleMiddle = Math.max(maxMiddleScale, auxHeight / auxScale + maxMiddleScale);
    var scaleBottom = 1 - yRatio;

    // Move/translate middleContainer
    Polymer.Base.transform('translate3d(0,' + yRatio * 100 + '%,0)', middleContainer);

    // Scale bottomContainer and bottom sub title to nothing and back
    Polymer.Base.transform('scale(' + scaleBottom + ') translateZ(0)', bottomContainer);

    // Scale middleContainer appName
    Polymer.Base.transform('scale(' + scaleMiddle + ') translateZ(0)', appName);
  });

  // Scroll page to top and expand header
  app.scrollPageToTop = function () {
    app.$.headerPanelMain.scrollToTop(true);
  };

  app.closeDrawer = function () {
    app.$.paperDrawerPanel.closeDrawer();
  };


  /*
    App custom definitions
  */

  /*  begin:GLOBAL DECLARATIONS  */

  app.IsUserSignedIn = false;
  app.selected = 0;
  app.userPromoCards = [];

  app.onBackSignIn = function () {
    app.selected = 0;
    page.redirect('/')
  };

  app.onSignOut = function () {
    firebase.auth().signOut();
  };

  app.configElementsBehavior = function () {
    _configAuthenticationObserver();
    _configNeonAnimatablePagesTransitions();
    _configAddPromoPageElementsBehavior();
  };


  var _configAuthenticationObserver = function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        app.IsUserSignedIn = true;
        app.$.loginFluxContainer.style.display = 'none';
        _configUserCardsListener();
      } else {
        app.IsUserSignedIn = false;
        app.$.loginFluxContainer.style.display = 'block';
      }
      page.redirect(app.baseUrl);
    });
  };

  var _configNeonAnimatablePagesTransitions = function () {
    var neonAnimatableList = app.$.authPages.querySelectorAll('neon-animatable');
    for (var cont = 0, len = neonAnimatableList.length; cont < len; cont++) {
      neonAnimatableList[cont].animationConfig = {
        exit: [{
          name: 'fade-out-animation',
          node: neonAnimatableList[cont],
          timing: {
            duration: 250
          }
        }],
        entry: [{
          name: 'fade-in-animation',
          node: neonAnimatableList[cont],
          timing: {
            duration: 500,
            delay: 250
          }
        }]
      };
    }
  };

  var _configAddPromoPageElementsBehavior = function () {
    app.$.promoCodesInput.addEventListener('change', function (event) {
      app.$.promoCodesInput.value = app.$.promoCodesInput.value.toUpperCase()
    });
  };

  var _showInformationToast = (function () {
    var _lastAddedClass = '';
    return function (message, customToastClass) {
      app.$.toast.querySelector('.toast-hide-button').innerHTML = message;
      if (!!customToastClass) {
        if (!!_lastAddedClass) {
          app.$.toast.classList.remove(_lastAddedClass);
        }
        _lastAddedClass = customToastClass;
        app.$.toast.classList.add(customToastClass);
      }
      app.$.toast.show();
    };
  })();

  /*  end:GLOBAL DECLARATIONS  */


  /*  begin:LOGIN PAGE  */

  app.onLogin = function () {
    if (app.$.loginForm.validate()) {
      firebase.auth().signInWithEmailAndPassword(app.$.loginEmail.value, app.$.loginPassword.value)
        .then(function (user) {}, function (error) {
          if (error.code == 'auth/invalid-email') {
            _showInformationToast('O email informado é inválido.', 'toast-error');
          } else {
            _showInformationToast('Usuário e senha não conferem.', 'toast-error');
          }
        })
    }
  };

  app.onSignIn = function () {
    page.redirect('/signIn')
  };

  /*  end:LOGIN PAGE  */


  /*  begin:CREATE ACCOUNT PAGE  */

  app.onCreateAccount = function () {
    if (app.$.signInForm.validate()) {
      //TODO: Validar cpf e telefone únicos
      firebase.auth().createUserWithEmailAndPassword(app.$.signInEmail.value, app.$.signInPassword.value)
        .then(_createUserProfile, _createAccountError);
    }
  };

  var _createUserProfile = function (user) {
    user.updateProfile({
        displayName: app.$.signInName.value
      })
      .then(function () {
        firebase.database().ref('users/' + user.uid)
          .set({
            name: app.$.signInName.value,
            email: app.$.signInEmail.value,
            cpf: app.$.signInCPF.value,
            phone: app.$.signInCel.value,
          })
          .then(_createUserProfileSuccess);
      })
      .catch(function (error) {
        firebase.database().ref('users/' + user.uid).delete()
          .then(function () {
            user.delete().then(_createAccountError);
          });
      });
  };

  var _createAccountError = function error(error) {
    if (error.code == "auth/email-already-in-use") {
      _showInformationToast('Sua conta de usuário não pode ser criada pois o e-mail informado já está sendo utilizado por outro usuário.', 'toast-error');
    } else {
      _showInformationToast('Ocorreu um erro na criação da sua conta de usuário. Confira os dados informados ou tente novamente em alguns instantes.', 'toast-error');
    }
  };

  var _createUserProfileSuccess = function () {
    _showInformationToast('Sua conta de usuário foi criada com sucesso!', 'toast-success');
    app.$.signInName.value = '';
    app.$.signInCPF.value = '';
    app.$.signInCel.value = '';
    app.$.signInEmail.value = '';
    app.$.signInPassword.value = '';
  };

  /*  end:CREATE ACCOUNT PAGE  */


  /*  begin:PASSWORD RECOVERY PAGE  */

  app.onRedefinePassword = function () {
    firebase.auth().sendPasswordResetEmail(app.$.forgotPasswordEmail.value)
      .then(_sendEmailForPasswordRecoverySuccess, _sendEmailForPasswordRecoveryError);
  };

  var _sendEmailForPasswordRecoverySuccess = function () {
    _showInformationToast('Um email foi enviado para você com instruções para redefinir sua senha.', 'toast-success');
    app.$.forgotPasswordEmail.value = '';
    page.redirect('/');
  };

  var _sendEmailForPasswordRecoveryError = function (error) {
    if (error.code == 'auth/invalid-email') {
      _showInformationToast('O email que você informou não é válido, confira o endereço informado e tente novamente.', 'toast-error');
    }
    if (error.code == 'auth/user-not-found') {
      _showInformationToast('Não foi encontrado um usuário para esse email, confira o endereço informado e tente novamente.', 'toast-error');
    }
  };

  /*  end:PASSWORD RECOVERY PAGE  */


  /*  begin:ADD PROMO CODE PAGE  */

  app.onAddPromoCode = function () {
    if (app.$.addPromoCodeForm.validate()) {
      _getPromoCodeByCodePromise()
        .then(_validateCodePromise)
        .then(_validatePromoPromise)
        .then(_addPromoCodePromise)
        .then(function () {
          _showInformationToast('Seu código promocional foi adicionado com sucesso.', 'toast-success');
          app.$.promoCodesInput.value = '';
        })
        .catch(function (error) {
          _showInformationToast(error, 'toast-error');
        });
    }
  };

  var _trackForStoreUpdates = function (storeKey) {
    var storesRef = firebase.database().ref('stores/' + storeKey);
    storesRef.off('value');
    storesRef.on('value', function (data) {
      _updateCardsStoreInformation(data.key, data.val());
    });
  };

  var _updateCardsStoreInformation = function (storeKey, storeInformation) {
    var card = app.userPromoCards.filter(function (elem) {
      return elem.store == storeKey;
    }).pop();
    card.storeName = storeInformation.name;
    card.address = storeInformation.address;
    card.phone = storeInformation.phone;
    _buildUserPromoCards();
  };

  var _validateCodePromise = function (promoCodeListSnap) {
    return new Promise(function (resolve, reject) {
      //Validate if promo code exists
      if (!!promoCodeListSnap.val()) {
        promoCodeListSnap.forEach(function (promoCodeSnap) {
          var currPromoCode = promoCodeSnap.val();
          //Validate if promo code is expired or in use
          if (!currPromoCode.user && (currPromoCode.timestamp + currPromoCode.expirationPeriod * 1000 * 60) > Date.now()) {
            resolve(promoCodeSnap);
          } else {
            reject('O código informado não é válido.');
            //TODO: Se o codigo não possuir cliente e estiver vencido, deletá-lo
          }
        });
      } else {
        reject('O código informado não é válido.');
      }
    });
  };

  var _validatePromoPromise = function (promoCodeSnap) {
    return new Promise(function (resolve, reject) {
      var currPromoCode = promoCodeSnap.val();
      firebase.database().ref('promos/' + currPromoCode.promo)
        .once('value').then(function (promoSnap) {
          var currPromo = promoSnap.val();
          //Validate if promo is active
          if (currPromo && currPromo.isActive && currPromo.expirationDate >= Date.now()) {
            firebase.database().ref('cards/' + firebase.auth().currentUser.uid).once('value')
              .then(function (userCardsSnap) {
                if (userCardsSnap.val()) {
                  resolve({
                    promoCode: promoCodeSnap,
                    promo: promoSnap,
                    userCards: userCardsSnap
                  });
                } else {
                  resolve({
                    promoCode: promoCodeSnap,
                    promo: promoSnap
                  });
                }
              });
          } else {
            reject('A promoção referente ao código informado não está mais ativa.');
          }
        });
    });
  };

  var _addPromoCodePromise = function (entities) {
    var updates = {};
    var currPromoCode = entities.promoCode.val();
    var currPromo = entities.promo.val();
    var currUserCards = (entities.userCards.val() || {});
    var userUID = firebase.auth().currentUser.uid;

    currPromoCode.user = userUID;
    if (!currPromo.users) {
      currPromo.users = {};
    }
    if (!currPromo.users[userUID]) {
      currPromo.users[userUID] = 1;
    } else {
      ++currPromo.users[userUID];
    }

    if (!currUserCards[currPromoCode.promo]) {
      currUserCards[currPromoCode.promo] = 1;
    } else {
      ++currUserCards[currPromoCode.promo];
    }

    updates['promoCodes/' + entities.promoCode.key] = currPromoCode;
    updates['promos/' + entities.promo.key] = currPromo;
    updates['cards/' + userUID] = currUserCards;

    var promise = firebase.database().ref().update(updates);
    _trackForStoreUpdates(currPromo.store);
    return promise;
  };

  var _getPromoCodeByCodePromise = function () {
    return firebase.database()
      .ref('promoCodes')
      .orderByChild('code')
      .equalTo(app.$.promoCodesInput.value)
      .limitToFirst(1)
      .once('value');
  };

  /*  end:ADD PROMO CODE PAGE  */


  /*  begin:HOME PAGE  */

  var _configUserCardsListener = function () {
    var cardsRef = firebase.database().ref('cards/' + firebase.auth().currentUser.uid);
    cardsRef.on('child_added', function (data) {
      _addCardElementToList(data.key, data.val());
    });

    cardsRef.on('child_changed', function (data) {
      _updateCardElement(data.key, data.val());
    });
  };

  var _addCardElementToList = function (cardKey, cardValue) {
    firebase.database().ref('promos/' + cardKey).once('value')
      .then(_validatePromoCardPromise)
      .then(function (promoSnap) {
        var currPromo = promoSnap.val();
        return firebase.database().ref('stores/' + currPromo.store).once('value')
          .then(function (storeSnap) {
            var currStore = storeSnap.val();
            _trackForStoreUpdates(storeSnap.key)
            app.userPromoCards.push({
              key: cardKey,
              user: firebase.auth().currentUser.uid,
              promo: promoSnap.key,
              store: storeSnap.key,
              promoDescription: currPromo.description,
              expirationDate: currPromo.expirationDate,
              storeName: currStore.name,
              address: currStore.address,
              phone: currStore.phone,
              numUserCodes: cardValue,
              completeAt: currPromo.completeAt,
              codeList: _getCodeList(currPromo.completeAt, cardValue)
            });
          });
      })
      .then(_buildUserPromoCards);
  };

  var _updateCardElement = function (cardKey, cardValue) {
    var card = app.userPromoCards.filter(function (elem) {
      return elem.key == cardKey;
    }).pop();
    card.numUserCodes = cardValue;
    card.codeList = _getCodeList(card.completeAt, cardValue);
    _buildUserPromoCards();
  };

  var _validatePromoCardPromise = function (promoSnap) {
    return new Promise(function (resolve, reject) {
      var currPromo = promoSnap.val();
      if (currPromo.isActive && currPromo.expirationDate > Date.now()) {
        resolve(promoSnap);
      } else {
        reject(promoSnap);
      }
    });
  };

  var _getRewardRequestsPromise = function (storeKey) {
    return firebase.database()
      .ref('rewards')
      .orderByChild('store_user')
      .equalTo(storeKey + '_' + firebase.auth().currentUser.uid)
      .once('value');
  };

  var _buildUserPromoCards = function () {
    app.$.userCardList.innerHTML = '';
    var cardCount = 1;
    app.userPromoCards.forEach(function (elem) {
      var template = document.querySelector('#userPromoCards').content;
      var promoCard = document.importNode(template, true);
      app.$.userCardList.appendChild(promoCard);

      var card = document.querySelector('#promoCard');
      card.setAttribute('id', 'promoCard' + cardCount++);
      card.$.storeName.textContent = elem.storeName;
      card.$.promoDescription.textContent = elem.promoDescription;
      card.$.expiration.textContent = (!!elem.expirationDate ? (new Date(elem.expirationDate)).toLocaleDateString() : ' - ')
      card.$.address.textContent = elem.address;
      card.$.phone.textContent = elem.phone;

      var completedCards = Math.floor(elem.numUserCodes / elem.completeAt);
      card.$.numUserCodes.textContent = (elem.numUserCodes % elem.completeAt) + '/' + elem.completeAt +
        (completedCards > 0 ? (' - ' + completedCards + (completedCards == 1 ? ' cartão completo' : ' cartões completos')) : '');

      _setRequestRewardButtonVisibility(card, completedCards, elem.store, elem.promo);

      card.$.completeAt.innerHTML = '';
      for (var codesCounter = completedCards * elem.completeAt; codesCounter < elem.codeList.length; codesCounter++) {
        var promoCode = elem.codeList[codesCounter];
        var child = document.createElement('iron-icon');
        child.setAttribute('icon', promoCode ? 'icons:star' : 'icons:star-border');
        if (promoCode) {
          child.style.color = '#FFAB00';
        } else {
          child.style.color = '#9E9E9E';
        }
        card.$.completeAt.appendChild(child);
      }

      _addPropertiesAndEventsToPromoCard(card, elem);
    });
  };

  var _setRequestRewardButtonVisibility = function (card, completedCards, storeKey, promoKey) {
    _getRewardRequestsPromise(storeKey)
      .then(function (rewardRequestListSnap) {

        var hasRewardRequest = false;
        if (rewardRequestListSnap.val()) {
          rewardRequestListSnap.forEach(function (rewardRequestSnap) {
            var rewardRequests = rewardRequestSnap.val();
            if (!rewardRequests)
              return;
            hasRewardRequest = rewardRequests.promo == promoKey && !rewardRequests.hasOwnProperty('approved');
          });
        }
        if (completedCards > 0 && !hasRewardRequest) {
          card.$.redeemReward.style.visibility = 'visible';
        } else {
          card.$.redeemReward.style.visibility = 'hidden';
        }

      });
  };

  var _addPropertiesAndEventsToPromoCard = function (uiCard, dbCard) {
    uiCard.onRedeemReward = function () {
      firebase.database().ref('rewards')
        .push({
          store: dbCard.store,
          user: dbCard.user,
          promo: dbCard.promo,
          store_user: dbCard.store + '_' + dbCard.user
        })
        .then(_redeemReward)
        .then(function () {
          _requestRewardSuccess(uiCard);
        });
    };
  };

  var _redeemReward = function (reward) {
    return new Promise(function (resolve, reject) {
      var rewardRef = firebase.database().ref('rewards/' + reward.key);
      rewardRef.on('child_added', function (data) {
        if (!(data.key == 'approved'))
          return;

        if (data.val()) {
          _showInformationToast('Tudo certo! Sua promoção já pode ser utilizada.', 'toast-success');
        } else {
          _showInformationToast('Ops, sua solicitação não foi aprovada!', 'toast-error');
        }
        _buildUserPromoCards();
      });
      resolve();
    });
  };

  var _requestRewardSuccess = function (uiCard) {
    _showInformationToast('Pronto, nós já informamos ao estabelecimento que você quer utilizar sua promoção. Agora é só aguardar a resposta!', 'toast-success');
    uiCard.$.redeemReward.style.visibility = 'hidden';
  };

  var _getCodeList = function (completeAt, ownedCodes) {
    var completedCards = (ownedCodes - (ownedCodes % completeAt)) / completeAt;
    var cardsList = [];
    for (var contCodes = 0; contCodes < (completedCards + 1) * completeAt; contCodes++) {
      cardsList.push(contCodes < ownedCodes);
    }
    return cardsList;
  };

  /*  end:HOME PAGE  */


})(document);