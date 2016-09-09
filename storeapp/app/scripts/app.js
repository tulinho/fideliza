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
  app.storePromos = [];

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
    _configDatePicherLocalization();
  };


  var _configAuthenticationObserver = function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        app.IsUserSignedIn = true;
        app.$.loginFluxContainer.style.display = 'none';
        _configHomePageExhibition();
        _configRewardRequestsObserver();
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

  var _configDatePicherLocalization = function () {
    moment.locale('pt-br');
    app.$.editPromoExpirationDate.i18n = {
      monthNames: moment.months(),
      weekdaysShort: moment.weekdaysShort(),
      firstDayOfWeek: moment.localeData().firstDayOfWeek(),
      today: 'Hoje',
      cancel: 'Cancelar',
      formatDate: function (d) {
        return moment(d).format(moment.localeData().longDateFormat('L'));
      },
      formatTitle: function (monthName, fullYear) {
        return monthName + ' ' + fullYear;
      }
    };
  };

  var _configRewardRequestsObserver = function () {
    firebase.database().ref('rewards')
      .orderByChild('store')
      .equalTo(firebase.auth().currentUser.uid)
      .on('value', function (data) {
        data.forEach(function (reward) {
          if ('approved' in reward.val()) {
            firebase.database().ref('rewards/' + reward.key).remove();
          } else {
            _showApproveRewardModal(reward.key, reward.val());
          }
        });
      });
  };

  var _showInformationToast = (function () {
    var _lastAddedClass = '';
    return function (message, customToastClass, duration) {
      app.$.toast.querySelector('.toast-hide-button').innerHTML = message;
      if (!!customToastClass) {
        if (!!_lastAddedClass) {
          app.$.toast.classList.remove(_lastAddedClass);
        }
        _lastAddedClass = customToastClass;
        app.$.toast.classList.add(customToastClass);
      }
      if (!!duration) {
        app.$.toast.duration = duration;
      }
      app.$.toast.show();
    };
  })();

  /*  end:GLOBAL DECLARATIONS  */


  /*  begin:APPROVE REWARD MODAL  */

  var _showApproveRewardModal = function (rewardKey, reward) {
    firebase.database().ref('users/' + reward.user)
      .once('value')
      .then(function (userSnap) {
        app.$.approveRewardDialogContent.textContent = userSnap.val().name;
        app.$.rewardToApprove.value = rewardKey;
        app.$.approveRewardDialog.open();
      });
  };

  app.onApproveReward = function () {
    var rewardRequestRef = firebase.database().ref('rewards/' + app.$.rewardToApprove.value);
    rewardRequestRef.once('value').then(function (rewardRequestSnap) {
      var cardRef = firebase.database().ref('cards/' + rewardRequestSnap.val().user + '/' + rewardRequestSnap.val().promo);
      var promoRef = firebase.database().ref('promos/' + rewardRequestSnap.val().store + '/users' + rewardRequestSnap.val().user);

      firebase.database().ref('promos/' + rewardRequestSnap.val().promo)
        .once('value')
        .then(function (promoSnap) {
          cardRef.transaction(function (amount) {
            return amount - promoSnap.val().completeAt;
          });
          promoRef.transaction(function (amount) {
            return amount - promoSnap.val().completeAt;
          });
          rewardRequestRef.update({
            approved: true
          });
        });
    });
  };

  app.onDisapproveReward = function () {
    var rewardRequest = firebase.database().ref('rewards/' + app.$.rewardToApprove.value);
    rewardRequest.update({
      approved: false
    });
  };

  /*  end:APPROVE REWARD MODAL */


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
        });
    }
  };

  app.onSignIn = function () {
    page.redirect('/signIn')
  };

  /*  end:LOGIN PAGE  */


  /*  begin:CREATE ACCOUNT PAGE  */

  app.onCreateAccount = function () {
    if (app.$.signInForm.validate()) {
      firebase.auth().createUserWithEmailAndPassword(app.$.signInEmail.value, app.$.signInPassword.value)
        .then(_createStoreProfile, _createAccountError);
    }
  };

  var _createStoreProfile = function (user) {
    user.updateProfile({
        displayName: app.$.signInName.value
      })
      .then(function () {
        firebase.database().ref('stores/' + user.uid)
          .set({
            active: true,
            name: app.$.signInName.value,
            email: app.$.signInEmail.value,
            address: app.$.signInAddress.value,
            phone: app.$.signInPhone.value,
          })
          .then(_createStoreProfileSuccess);
      })
      .catch(function (error) {
        firebase.database().ref('stores/' + user.uid).delete()
          .then(function () {
            user.delete().then(_createAccountError);
          });
      });
  };

  var _createAccountError = function error(error) {
    if (error.code == "auth/email-already-in-use") {
      _showInformationToast('Sua conta não pode ser criada pois o e-mail informado já está sendo utilizado.', 'toast-error');
    } else {
      _showInformationToast('Ocorreu um erro na criação da sua conta. Confira os dados informados ou tente novamente em alguns instantes.', 'toast-error');
    }
  };

  var _createStoreProfileSuccess = function () {
    _showInformationToast('Sua conta foi criada com sucesso!', 'toast-success');
    app.$.signInName.value = '';
    app.$.signInAddress.value = '';
    app.$.signInPhone.value = '';
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


  /*  begin:HOME PAGE  */

  var _configHomePageExhibition = function () {
    _getStorePromos();
  };

  var _getStorePromos = function () {
    firebase.database().ref('promos')
      .orderByChild('store')
      .equalTo(firebase.auth().currentUser.uid)
      .on('value', function (promoSnapList) {
        return new Promise(function (resolve, reject) {
          var promoSnapOrderedList = [];
          promoSnapList.forEach(function (promoSnap) {
            promoSnapOrderedList.push(promoSnap);
          });
          promoSnapOrderedList.sort(function (obj1, obj2) {
            return obj1.val().isActive < obj2.val().isActive;
          });

          _addPendingRewardRequestInformationToPromos(promoSnapOrderedList)
            .then(_buildPromoCards)
        });
      });
  };

  var _addPendingRewardRequestInformationToPromos = function (promoSnapList) {
    return new Promise(function (resolve, reject) {
      var promoList = [];
      var promises = [];
      promoSnapList.forEach(function (elem) {
        promises.push((function (promoSnap) {
          return firebase.database().ref('rewards')
            .orderByChild('promo')
            .equalTo(promoSnap.key)
            .once('value')
            .then(_getPendingRewardRequestList)
            .then(function (pendingList) {
              var promo = promoSnap.val();
              promo.key = promoSnap.key;
              promo.pending = pendingList.length;
              promoList.push(promo);
            });
        })(elem));
      });
      Promise.all(promises).then(function () {
        promoList.sort(function (elem1, elem2) {
          return elem1.isActive < elem2.isActive;
        });
        resolve(promoList);
      });
    });
  };

  var _getPendingRewardRequestList = function (rewardSnapList) {
    return new Promise(function (resolve, reject) {
      var pendingList = [];
      rewardSnapList.forEach(function (rewardSnap) {
        if (!('approved' in rewardSnap.val())) {
          pendingList.push(rewardSnap);
        }
      });
      resolve(pendingList);
    });
  };

  var _buildPromoCards = function (promoList) {
    app.$.promoCardList.innerHTML = '';
    var cardCount = 1;
    app.storePromos = [];
    promoList.forEach(function (elem) {
      var template = document.querySelector('#storePromoCard').content;
      var promoCard = document.importNode(template, true);
      app.$.promoCardList.appendChild(promoCard);

      var card = document.querySelector('#promo');
      card.setAttribute('id', 'promo' + cardCount++);
      card.setAttribute('data-promo', elem.key);
      card.$.promoDescription.textContent = elem.description;
      card.$.pendingRequests.textContent = elem.pending;
      var isActive = elem.isActive && elem.expirationDate > Date.now();
      card.$.isActive.textContent = isActive ? 'sim' : 'não';
      if (!isActive) {
        card.$.generateCode.style.display = 'none';
      }
      _createCardEvents(card);
    });
  };

  var _createCardEvents = function (card) {
    card.onGenerateCode = function () {
      var generatedCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 3).toUpperCase() + (Math.random() * 10000 + "").substr(0, 4);
      var promoCode = {
        code: generatedCode,
        expirationPeriod: 600,
        promo: card.getAttribute('data-promo'),
        timestamp: Date.now()
      };
      firebase.database().ref('promoCodes').push(promoCode)
        .then(function () {
          app.$.newCodeDialogContent.textContent = generatedCode;
          app.$.newCodeDialog.open();
        });
    };
    card.onEditPromo = function () {
      page('/editPromo/' + card.getAttribute('data-promo'));
    };
  };

  /*  end:HOME PAGE  */


  /*  begin:ADD PROMO PAGE  */

  app.onEditPromo = function (key) {
    _clearEditPromoPage();
    if (!!key) {
      firebase.database().ref('promos/' + key).once('value')
        .then(function (promoSnap) {
          app.$.editPromoKey.value = promoSnap.key;
          var promo = promoSnap.val();
          app.$.editPromoCompleteAt.value = promo.completeAt;
          app.$.editPromoDescription.value = promo.description;
          app.$.editPromoExpirationDate.value = (new Date(promo.expirationDate)).toISOString().split('T').shift();
          app.$.editPromoIsActive.checked = promo.isActive;
        });
    }
  };

  app.onSavePromo = function () {
    if (app.$.editPromoForm.validate()) {
      var expirationDate = new Date(app.$.editPromoExpirationDate.value + "T23:59:59");
      if (expirationDate.getTime() <= Date.now()) {
        _showInformationToast('A data de vigência da promoção deve ser maior que a data atual.', 'toast-error');
        return;
      }
      var promoInfo = {
        completeAt: app.$.editPromoCompleteAt.value,
        description: app.$.editPromoDescription.value,
        expirationDate: expirationDate.getTime(),
        isActive: app.$.editPromoIsActive.checked,
        store: firebase.auth().currentUser.uid
      };
      if (app.$.editPromoKey.value) {
        firebase.database().ref('promos/' + app.$.editPromoKey.value).set(promoInfo).then(_savePromoSuccess);
      } else {
        firebase.database().ref('promos').push(promoInfo).then(_savePromoSuccess);
      }
    }
  };

  var _savePromoSuccess = function () {
    _showInformationToast('Promoção salva com sucesso.', 'toast-success');
    _clearEditPromoPage();
    page('/');
  };

  var _clearEditPromoPage = function () {
    app.$.editPromoKey.value = '';
    app.$.editPromoCompleteAt.value = '';
    app.$.editPromoDescription.value = '';
    app.$.editPromoExpirationDate.value = '';
    app.$.editPromoIsActive.checked = true;
  };

  /*  end:ADD PROMO PAGE  */


})(document);