var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
    }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method


    /******** 从这里开始看，上面不要看 ************/


    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)
    const session = JSON.parse(fs.readFileSync('./session.json').toString())
    if (path === "/sign_in" && method === "POST") {
        response.setHeader("Content-Type", "text/html,charset = uft-8")
        const userArray = JSON.parse(fs.readFileSync("./db/users.json"))
        const array = []
        request.on("data", (e) => {
            array.push(e)
        })
        request.on("end", () => {
            const string = Buffer.concat(array).toString()
            const obj = JSON.parse(string)
            const user = userArray.find(user => user.name === obj.name && user.password === obj.password)
            console.log(user)
            if (user === undefined) {
                response.statusCode = 400
                response.setHeader("Content-Type", "text/json; charset=utf-8");
            } else {
                response.statusCode = 200;
                // 设置 HttpOnly，防止 cookie 被更改
                const random = Math.random()
                const session = JSON.parse(fs.readFileSync('./session.json').toString())
                session[random] = {user_id: user.id}
                fs.writeFileSync("./session.json", JSON.stringify(session))
                // session_id: 传一个随机数给浏览器，防止 cookie 的值被更改
                response.setHeader("Set-Cookie", `session_id = ${random}; HttpOnly`)
            }
            response.end()
        })
    } else if (path === "/home.html") {
        // 注意语法格式
        // cookie 为小写
        const cookie = request.headers["cookie"];
        let sessionId;
        try {
            sessionId = cookie
                .split(";")
                .filter(s => s.indexOf("session_id=") >= 0)[0]
                .split("=")[1];
        } catch (error) {
        }
        if (sessionId && session[sessionId]) {
            // Cookie id
            const userId = session[sessionId].user_id
            const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
            const user = userArray.find(user => user.id === userId);
            const homeHtml = fs.readFileSync("./public/home.html").toString();
            let string = ''
            if (user) {
                string = homeHtml.replace("{{loginStatus}}", "已登录")
                    .replace('{{user.name}}', user.name)
            }
            response.write(string);
        } else {
            const homeHtml = fs.readFileSync("./public/home.html").toString();
            const string = homeHtml.replace("{{loginStatus}}", "未登录")
                .replace('{{user.name}}', '')
            response.write(string);
        }
        response.end()
    } else if (path === "/register" && method === "POST") {
        response.setHeader("Content-Type", "text/html,charset = uft-8")
        // 转化为 JS 数组
        const userArray = JSON.parse(fs.readFileSync("./db/users.json"))
        const array = []
        request.on("data", (e) => {
            // array 是符合 JSON 规则的数组
            // 编码方式：utf8
            array.push(e)
        })
        request.on("end", () => {
            // Buffer 对象是 Node 处理二进制数据的一个接口
            // Buffer.concat() 将一组 Buffer 对象合并为一个 Buffer 对象。
            // 如果 Buffer.concat 的参数数组只有一个成员，就直接返回该成员。
            // 如果有多个成员，就返回一个多个成员合并的新 Buffer 对象。
            // Buffer 对象与字符串的互相转换，需要指定编码格式
            // 转化为 JSON 字符串
            const string = Buffer.concat(array).toString()
            // 转化为 JS 对象
            const obj = JSON.parse(string)
            const lastUser = userArray[userArray.length - 1]
            const newArray = {
                // 如果 JSON 数组为空，则 id = 1
                id: lastUser ? lastUser.id + 1 : 1,
                name: obj.name,
                password: obj.password
            }
            // 以上的所有操作都是为了得到 newArray 并将其放到 userArray
            // 此时的 userArray 是一个 JS 数组
            userArray.push(newArray)
            fs.writeFileSync("./db/users.json", JSON.stringify(userArray))
            response.end()
        })
    } else {
        response.statusCode = 200
        // 默认首页
        const filePate = path === "/" ? "/index.html" : path
        // 设置文件格式
        const index = filePate.lastIndexOf('.')
        const suffix = filePate.substring(index)
        const fileType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }
        response.setHeader('Content-Type', `${fileType[suffix] || 'text/html'};charset=utf-8`)
        // 设置文件在目录中不存在时报错
        let content
        try {
            content = fs.readFileSync(`./public${filePate}`)
        } catch (error) {
            content = '文件不存在'
            response.statusCode = 404
        }
        response.write(content)
        response.end()
    }


    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)