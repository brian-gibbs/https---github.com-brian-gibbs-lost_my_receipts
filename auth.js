// Get elements
const buyCreditsButton = document.getElementById('buyCreditsButton');
const creditCount = document.getElementById('creditCount');
const availableCredits = document.getElementById('availableCredits');
const buyCreditsModal = document.getElementById('buyCreditsModal');

// Add a sign-in status display to the header
const headerDiv = document.querySelector('header div.flex');
const authStatusElement = document.createElement('div');
authStatusElement.className = 'flex items-center mr-4';
authStatusElement.innerHTML = `
  <span id="authStatus" class="text-sm">Not signed in</span>
  <button id="signInButton" class="ml-2 bg-secondary hover:bg-primary text-white px-3 py-1 rounded-md text-xs">Sign In</button>
  <button id="signOutButton" class="ml-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-xs hidden">Sign Out</button>
`;
headerDiv.prepend(authStatusElement);

const authStatus = document.getElementById('authStatus');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');

// Auth state change handler
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in
    const isAnonymous = user.isAnonymous;
    authStatus.textContent = isAnonymous ? 'Signed in anonymously' : `Hello, ${user.displayName || user.email}`;
    signInButton.classList.add('hidden');
    signOutButton.classList.remove('hidden');
    
    // Load user's credits from Firestore
    firebase.firestore().collection('users').doc(user.uid).get()
      .then((doc) => {
        if (doc.exists) {
          const credits = doc.data().credits || 0;
          updateCreditDisplay(credits);
        } else {
          // Create user document if it doesn't exist
          firebase.firestore().collection('users').doc(user.uid).set({
            credits: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAnonymous: isAnonymous
          });
        }
      })
      .catch((error) => {
        console.error("Error getting user data:", error);
      });
  } else {
    // User is signed out
    authStatus.textContent = 'Not signed in';
    signInButton.classList.remove('hidden');
    signOutButton.classList.add('hidden');
    
    // Sign in anonymously by default
    signInAnonymously();
  }
});

// Sign in functions
function signInAnonymously() {
  firebase.auth().signInAnonymously()
    .catch((error) => {
      console.error("Anonymous auth error:", error);
    });
}

signInButton.addEventListener('click', function() {
  // Create sign-in UI
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .catch((error) => {
      console.error("SSO error:", error);
    });
});

signOutButton.addEventListener('click', function() {
  firebase.auth().signOut()
    .then(() => {
      // Sign in anonymously after signing out
      signInAnonymously();
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
});

// Override the credit functions to use Firestore
function updateCreditDisplay(credits) {
  // Update both credit displays
  creditCount.textContent = credits;
  availableCredits.textContent = credits;
}

function addCredits(amount) {
  const user = firebase.auth().currentUser;
  if (user) {
    firebase.firestore().collection('users').doc(user.uid).update({
      credits: firebase.firestore.FieldValue.increment(amount)
    })
    .then(() => {
      // Re-fetch the updated count
      firebase.firestore().collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            updateCreditDisplay(doc.data().credits || 0);
          }
        });
    })
    .catch((error) => {
      console.error("Error adding credits:", error);
    });
  }
}

function useCredits(amount) {
  const user = firebase.auth().currentUser;
  if (user) {
    return firebase.firestore().collection('users').doc(user.uid).get()
      .then((doc) => {
        if (doc.exists) {
          const currentCredits = doc.data().credits || 0;
          if (currentCredits >= amount) {
            return firebase.firestore().collection('users').doc(user.uid).update({
              credits: firebase.firestore.FieldValue.increment(-amount)
            })
            .then(() => {
              // Re-fetch the updated count
              return firebase.firestore().collection('users').doc(user.uid).get()
                .then((updatedDoc) => {
                  if (updatedDoc.exists) {
                    updateCreditDisplay(updatedDoc.data().credits || 0);
                  }
                  return true;
                });
            });
          } else {
            return Promise.resolve(false);
          }
        } else {
          return Promise.resolve(false);
        }
      })
      .catch((error) => {
        console.error("Error using credits:", error);
        return Promise.resolve(false);
      });
  } else {
    return Promise.resolve(false);
  }
}