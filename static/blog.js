document.addEventListener("DOMContentLoaded", () => {
  const posts = document.querySelectorAll(".blog-post");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  let current = 0;

  function showPost(index) {
    posts.forEach((post, i) => post.classList.toggle("active", i === index));
  }

  prevBtn.addEventListener("click", () => {
    current = (current - 1 + posts.length) % posts.length;
    showPost(current);
  });

  nextBtn.addEventListener("click", () => {
    current = (current + 1) % posts.length;
    showPost(current);
  });

  showPost(current);
});
