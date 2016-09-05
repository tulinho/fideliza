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
  };


  var _configAuthenticationObserver = function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        app.IsUserSignedIn = true;
        app.$.loginFluxContainer.style.display = 'none';
        /*_configUserCardsListener();*/
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

  /*  end:HOME PAGE  */


})(document);