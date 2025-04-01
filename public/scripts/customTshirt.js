document.addEventListener("DOMContentLoaded", () => {
    // Initialize Fabric.js canvases for front and back
    const canvasFront = new fabric.Canvas("tshirt-canvas-front");
    const canvasBack = new fabric.Canvas("tshirt-canvas-back");

    let currentCanvas = canvasFront; // Track the active canvas

    // Toggle between front and back views
    const toggleSideButton = document.getElementById("toggleSide");
    const tshirtFront = document.getElementById("tshirt-front");
    const tshirtBack = document.getElementById("tshirt-back");
    toggleSideButton.addEventListener("click", () => {
        if (tshirtFront.style.display === "none") {
            tshirtFront.style.display = "block";
            tshirtBack.style.display = "none";
            currentCanvas = canvasFront;
            toggleSideButton.textContent = "Show Back Side";
        } else {
            tshirtFront.style.display = "none";
            tshirtBack.style.display = "block";
            currentCanvas = canvasBack;
            toggleSideButton.textContent = "Show Front Side";
        }
    });

     // Add keydown event listener for delete functionality
     document.addEventListener("keydown", function (e) {
        if (e.key === "Delete") {
            console.log("Removing selected element on Fabric.js on DELETE key!");
            const activeObject = currentCanvas.getActiveObject();
            if (activeObject) {
                currentCanvas.remove(activeObject);
            } else {
                console.log("No object selected to delete.");
            }
        }
    });

    // Change T-shirt color
    const tshirtColorSelect = document.getElementById("tshirt-color");
    tshirtColorSelect.addEventListener("change", (event) => {
        const color = event.target.value;
        document.getElementById("tshirt-backgroundpicture-front").style.backgroundColor = color;
        document.getElementById("tshirt-backgroundpicture-back").style.backgroundColor = color;
    });

    // Add predefined design
    const tshirtDesignSelect = document.getElementById("tshirt-design");
    tshirtDesignSelect.addEventListener("change", (event) => {
        const imageUrl = event.target.value;
        if (imageUrl) {
            fabric.Image.fromURL(imageUrl, (img) => {
                img.scale(0.4); // Adjust size
                currentCanvas.add(img);
            });
        }
    });

    // Upload custom image
    const tshirtCustomPictureInput = document.getElementById("tshirt-custompicture");
    tshirtCustomPictureInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                img.scaleToHeight(300);
                img.scaleToWidth(300); 
                img.scale(0.5); // Adjust size
                currentCanvas.add(img);
            });
        };
        reader.readAsDataURL(file);
    });

    // Add text
    const addTextButton = document.getElementById("addText");
    const tshirtTextInput = document.getElementById("tshirt-text");
    const fontSelect = document.getElementById("font-select");
    addTextButton.addEventListener("click", () => {
        const text = tshirtTextInput.value.trim();
        if (!text) return;

        const newText = new fabric.Textbox(text, {
            left: 50,
            top: 50,
            fontSize: 30,
            fontFamily: fontSelect.value,
            fill: "#000000",
        });
        currentCanvas.add(newText);
    });

    // Clear canvas
    const clearCanvasButton = document.getElementById("clearCanvas");
    clearCanvasButton.addEventListener("click", () => {
        currentCanvas.clear();
    });

    

    // Download image
    const downloadImageButton = document.getElementById("downloadImage");
    downloadImageButton.addEventListener("click", () => {
        const tshirtDiv = document.querySelector(".tshirt-side:not([style*='display: none']) .tshirt-div");

        domtoimage.toBlob(tshirtDiv).then((blob) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "tshirt-design.png";
            link.click();
        }).catch((error) => {
            console.error("Error downloading image:", error);
            alert("Failed to download the image.");
        });
    });

    // Save design
    const saveImageButton = document.getElementById("saveImage");
    saveImageButton.addEventListener("click", async () => {
        try {
            // Capture front design with reduced size
            const frontDesign = await domtoimage.toPng(document.getElementById("tshirt-div-front"), {
                width: 250, // Set a smaller width
                height: 400, 
                style: { transform: "scale(0.4)" }, // Scale down the content
            });

            // Capture back design with reduced size
            const backDesign = await domtoimage.toPng(document.getElementById("tshirt-div-back"), {
                width: 250, // Set a smaller width
                height: 400,
                style: { transform: "scale(0.4)" }, // Scale down the content
            });

            // Send designs to backend
            const response = await fetch("/api/save-design", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frontDesign, backDesign }),
            });

            if (response.ok) {
                alert("Design saved successfully!");
            } else {
                alert("Failed to save design.");
            }
        } catch (error) {
            console.error("Error saving design:", error);
            alert("An error occurred while saving the design.");
        }
    });
});