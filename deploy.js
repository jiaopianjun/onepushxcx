import inquirer from 'inquirer'
import shell from 'shelljs'
import fs from 'fs'
import ci from 'miniprogram-ci'
import path from 'path'
const username = 'lecooe' // 你发布时的名字
const __dirname = ''
const config = [{
    appid: "appid",
    env: "prod",
    name: "小程序名",
  }];
// 写入json文件选项
function writeJson(appid) {
  return new Promise((resovle) => {
    //现将json文件读出来
    fs.readFile(
      path.join(__dirname, "dist/dev/mp-weixin/project.config.json"),
      function (err, data) {
        if (err) {
          return console.error(err);
        }
        var temp = data.toString(); //将二进制的数据转换为字符串
        temp = JSON.parse(temp); //将字符串转换为json对象
        temp.appid = appid;

        var str = JSON.stringify(temp); //因为nodejs的写入文件只认识字符串或者二进制数，所以把json对象转换成字符串重新写入json文件中
        fs.writeFile(
          path.join(__dirname, "dist/dev/mp-weixin/project.config.json"),
          str,
          function (err) {
            if (err) {
              console.error(err);
              // 回滚
              fs.writeFile(
                path.join(__dirname, "dist/dev/mp-weixin/project.config.json"),
                data.toString(),
                function (err) {
                  if (err) {
                    console.error(err);
                  }
                  resovle();
                  console.log("----------修改Appid成功---- a---------");
                }
              );
            }
            resovle();
            console.log("----------修改Appid成功---- b---------");
          }
        );
      }
    );
  });
}

// 版本自加算法
function versionAutoAdd(version, index) {
  if (!version) return new Error("版本号不存在");
  let arr = version.split(".");
  index === undefined && (index = arr.length - 1);
  let newVal = parseInt(arr[index] || "0") + 1;
  if (newVal > 20 && index !== 0) {
    arr.splice(index, 1, 0);
    if (index < 0) return arr.join(".");
    return versionAutoAdd(arr.join("."), index - 1);
  } else {
    arr.splice(index, 1, newVal);
    return arr.join(".");
  }
}

// 设置版本号
function setVersion(appid, versions, setedVersion) {
  return new Promise((resovle) => {
    if (setedVersion) {
      versions[appid] = setedVersion;
    } else {
      versions[appid] = versionAutoAdd(versions[appid]);
    }
    var str = JSON.stringify(versions); //因为nodejs的写入文件只认识字符串或者二进制数，所以把json对象转换成字符串重新写入json文件中
    fs.writeFile(path.join(__dirname, "keys/version.json"), str, function (err) {
      if (err) {
        console.error(err);
      }
      resovle();
      console.log("----------自增版本号成功---- ß---------");
    });
  });
}

// 获取版本号
function getVersions() {
  return new Promise((resovle) => {
    //现将json文件读出来
    fs.readFile(path.join(__dirname, "keys/version.json"), function (err, data) {
      if (err) {
        return console.error(err);
      }
      var data = data.toString(); //将二进制的数据转换为字符串
      //将字符串转换为json对象
      resovle(JSON.parse(data));
    });
  });
}

// 上传小程序
const uploadMini = (options) => {
  return new Promise(async (resovle) => {
    let {
      appid,
      remark,
      name
    } = options;
    // 获取版本号
    const versions = await getVersions();
    // 获取自增后的版本号
    const version = versionAutoAdd(versions[appid]);
    const project = new ci.Project({
      appid: appid, // 小程序appid
      type: "miniProgram", // 类型，小程序或小游戏
      projectPath: path.join(__dirname, "dist/dev/mp-weixin"), // 项目路径
      privateKeyPath: process.cwd() + `/keys/${appid}.key`, // 密钥路径
      ignores: ["node_modules/**/*"], // 忽略的文件
    });
    // 调用上传方法
    ci.upload({
        project,
        version: version || "1.0.0",
        desc: username + ":" + remark, //主机名,
        setting: {
          es6: true, // 是否 "es6 转 es5"
          es7: true, // 是否 "es7 转 es5"
          minify: true, // 是否压缩代码
        },
      })
      .then(async (res) => {
        console.log("----------代码上传成功---- ß---------");
        await setVersion(appid, versions, version);
        resovle({
          isSuccess: true,
        });
      })
      .catch((error) => {
        console.log("上传失败");
        resovle({
          isSuccess: false,
        });
        process.exit(-1);
      });
  });
};

inquirer
  .prompt([{
      type: "input", // 类型
      name: "remark", // 字段名称，在then里可以打印出来
      message: "备注:", // 提示信息
    },
    {
      type: "checkbox",
      message: "请选择你要发布的环境?",
      name: "type",
      choices: config.map((item) => {
        return {
          name: item.name,
          value: item.appid,
        };
      }),
    },
  ])
  .then(async (answers) => {
    console.log(answers, '----------------------------');
    // 队列式上传
    for (let appid of answers.type) {
      switch (appid) {
        case "appid":
          console.log("正在发布小程序名，请稍等...");
          break;
        // 可以参考上面加
        default:
          break;
      }
      //   shell.exec("yarn run build:mp-weixin");
      // 修改打包文件的appid为当前appid
      await writeJson(appid);
      // 上传小程序
      await uploadMini({
        appid: appid,
        remark: answers.remark,
      });
    }
  });