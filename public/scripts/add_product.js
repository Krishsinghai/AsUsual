let images = [];

// Handle image upload and preview
document.getElementById("imageInput").addEventListener("change", function (event) {
    let preview = document.getElementById("preview");
    preview.innerHTML = ""; // Clear previous images

    const files = Array.from(event.target.files);

    if (files.length > 6) {
        alert("You can only upload a maximum of 6 images.");
        this.value = ''; // Clear input
        return;
    }

    images = []; // Reset images array
    let pendingReaders = files.length; // Track pending FileReaders

    files.forEach((file) => {
        let reader = new FileReader();
        reader.onload = function (e) {
            let img = document.createElement("img");
            img.src = e.target.result;
            img.style.width = "80px";
            preview.appendChild(img);

            images.push(e.target.result); // Store Base64 image

            pendingReaders--;
            if (pendingReaders === 0) {
                console.log(images); // Log only after all images are processed
            }
        };
        reader.readAsDataURL(file);
    });
});

// Handle form submission
document.getElementById("productForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value;
    const price = document.getElementById("price").value;
    const category = document.getElementById("category").value;
    const brand = document.getElementById("brand").value || "AsUsual";
    const stock = document.getElementById("stock").value;

    if (images.length === 0) {
        alert("Please upload at least one image.");
        return;
    }

    const productData = { name, description, price, category, brand, stock, images };

    fetch('http://localhost:5000/add-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Product added:", data);
        displayProduct(productData);
        document.getElementById("productForm").reset();
        document.getElementById("preview").innerHTML = "";
        images = [];
    })
    .catch(error => console.error("Error:", error));
});

// Function to display product
function displayProduct(product) {
    const gallery = document.getElementById("product-gallery");

    const productDiv = document.createElement("div");
    productDiv.classList.add("product-item");

    productDiv.innerHTML = `
        <h4>${product.name}</h4>
        <p>${product.description}</p>
        <p>Price: $${product.price}</p>
        <p>Category: ${product.category}</p>
        <p>Brand: ${product.brand}</p>
        <p>Stock: ${product.stock}</p>
        <div class="product-images">
            ${product.images.map(img => `<img src="${img}" style="width:80px;">`).join('')}
        </div>
    `;

    gallery.appendChild(productDiv);
}
