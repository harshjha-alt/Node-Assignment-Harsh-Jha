const http = require("http");

const users = [
  { id: 1, name: "Asha", role: "admin" },
  { id: 2, name: "Rahul", role: "member" }
];

let nextId = 3;


// Send JSON response
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}


// Read JSON body
function getBody(req) {
  return new Promise((resolve, reject) => {

    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {

      if (!data) {
        resolve({});
        return;
      }

      try {
        const body = JSON.parse(data);
        resolve(body);
      } catch (error) {
        reject({
          status: 400,
          message: "Invalid JSON"
        });
      }

    });

    req.on("error", () => {
      reject({
        status: 400,
        message: "Error reading request"
      });
    });

  });
}


// Handle all requests
async function handleRequest(req, res) {

  const url = new URL(req.url, `http://${req.headers.host}`);

  const path = url.pathname;
  const method = req.method;


  // GET /users
  // GET /users?role=admin

  if (method === "GET" && path === "/users") {

    const role = url.searchParams.get("role");

    let result = users;

    if (role) {
      result = users.filter(user => user.role === role);
    }

    sendResponse(res, 200, result);
    return;
  }


  // GET /users/:id

  if (method === "GET" && path.startsWith("/users/")) {

    const id = Number(path.split("/")[2]);

    if (Number.isNaN(id)) {
      sendResponse(res, 400, {
        error: "Invalid user id"
      });
      return;
    }

    const user = users.find(user => user.id === id);

    if (!user) {
      sendResponse(res, 404, {
        error: "User not found"
      });
      return;
    }

    sendResponse(res, 200, user);
    return;
  }


  // POST /users

  if (method === "POST" && path === "/users") {

    try {

      const body = await getBody(req);

      if (
        typeof body.name !== "string" ||
        body.name.trim() === ""
      ) {
        sendResponse(res, 422, {
          error: "name is required"
        });
        return;
      }

      const newUser = {
        id: nextId++,
        name: body.name.trim(),
        role: body.role || "member"
      };

      users.push(newUser);

      sendResponse(res, 201, newUser);
      return;

    } catch (error) {

      sendResponse(res, error.status || 500, {
        error: error.message || "Something went wrong"
      });

      return;
    }
  }


  // DELETE /users/:id

  if (method === "DELETE" && path.startsWith("/users/")) {

    const id = Number(path.split("/")[2]);

    if (Number.isNaN(id)) {
      sendResponse(res, 400, {
        error: "Invalid user id"
      });
      return;
    }

    const index = users.findIndex(user => user.id === id);

    if (index === -1) {
      sendResponse(res, 404, {
        error: "User not found"
      });
      return;
    }

    const deletedUser = users.splice(index, 1)[0];

    sendResponse(res, 200, {
      message: "User deleted successfully",
      user: deletedUser
    });

    return;
  }


  // Any unknown route

  sendResponse(res, 404, {
    error: "Route not found"
  });
}


// Create server

const server = http.createServer(async (req, res) => {

  try {

    await handleRequest(req, res);

  } catch (error) {

    console.error(error);

    sendResponse(res, 500, {
      error: "Internal Server Error"
    });
  }

});


// Start server

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});