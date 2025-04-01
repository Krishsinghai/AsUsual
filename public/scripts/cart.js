document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");
    updateCart();

    function updateCart() {
        let totalItems = 0;
        let totalPrice = 0;

        document.querySelectorAll(".cart-item").forEach(item => {
            let quantityElem = item.querySelector(".cart-quantity");
            let quantity = parseInt(quantityElem.textContent);
            let price = parseInt(item.dataset.price);
            let itemTotalElem = item.querySelector(".item-total");

            // Update total for this item
            let itemTotal = price * quantity;
            itemTotalElem.textContent = itemTotal;

            // Update overall totals
            totalItems += quantity;
            totalPrice += itemTotal;
        });

        document.getElementById("total-items").textContent = totalItems;
        document.getElementById("total-price").textContent = totalPrice;
        document.getElementById("final-total").textContent = totalPrice + 5; // Adding shipping cost
    }

    // Add event listeners to "+" buttons
    document.querySelectorAll(".increase").forEach(button => {
        button.addEventListener("click", function() {
            let quantityElem = this.previousElementSibling;
            quantityElem.textContent = parseInt(quantityElem.textContent) + 1;
            updateCart();
        });
    });

    // Add event listeners to "-" buttons
    document.querySelectorAll(".decrease").forEach(button => {
        button.addEventListener("click", function() {
            let quantityElem = this.nextElementSibling;
            let currentQuantity = parseInt(quantityElem.textContent);

            if (currentQuantity > 1) {
                quantityElem.textContent = currentQuantity - 1;
                updateCart();
            }
        });
    });

    // Initialize the cart update on page load
    updateCart();
});
// order btn

document.querySelector(".order").addEventListener("click", function () {
    let button = this;
  
    if (!button.classList.contains("animate")) {
      button.classList.add("animate");
  
      setTimeout(() => {
        button.classList.remove("animate");
      }, 10000);
    }
  });