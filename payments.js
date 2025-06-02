// Handle credit purchases with Stripe
const buyCreditsButtons = document.querySelectorAll('.buy-credits-btn');

buyCreditsButtons.forEach(button => {
  button.addEventListener('click', function() {
    const plan = this.dataset.plan;
    const credits = parseInt(this.dataset.credits);
    const price = parseFloat(this.dataset.price);
    
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('Please sign in to purchase credits.');
      return;
    }
    
    if (user.isAnonymous) {
      // Ask if they want to create an account first
      if (confirm('You are currently using an anonymous account. Would you like to create a permanent account to save your credits?')) {
        // Show sign-in options
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().currentUser.linkWithPopup(provider)
          .then((result) => {
            // Anonymous account successfully upgraded
            alert('Your account has been upgraded. Now proceeding to purchase.');
            handleCheckout(plan, credits, price);
          })
          .catch((error) => {
            console.error("Account linking error:", error);
            alert('Account upgrade failed. Proceeding with anonymous account.');
            handleCheckout(plan, credits, price);
          });
      } else {
        // Proceed with anonymous account
        handleCheckout(plan, credits, price);
      }
    } else {
      // Already signed in with non-anonymous account
      handleCheckout(plan, credits, price);
    }
  });
});

function handleCheckout(plan, credits, price) {
  // Create a checkout session
  const createCheckoutSession = firebase.functions().httpsCallable('createCheckoutSession');
  
  createCheckoutSession({
    plan: plan,
    credits: credits,
    price: price
  })
  .then((result) => {
    const sessionId = result.data.id;
    return stripe.redirectToCheckout({ sessionId: sessionId });
  })
  .then((result) => {
    if (result.error) {
      alert(result.error.message);
    }
  })
  .catch((error) => {
    console.error("Error creating checkout:", error);
    alert('There was an error processing your payment. Please try again.');
    
    // For demo/testing purposes only - remove in production
    if (confirm('For testing: Would you like to simulate a successful payment?')) {
      addCredits(credits);
      alert(`Added ${credits} credits to your account!`);
    }
  });
}

// For the demo "Purchase Credits" button
const confirmAddCredits = document.getElementById('confirmAddCredits');
confirmAddCredits.addEventListener('click', function() {
  // In production, this would be handled by the actual Stripe checkout
  addCredits(999);
  buyCreditsModal.classList.add('hidden');
});