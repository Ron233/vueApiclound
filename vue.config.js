const WebpackOnBuildPlugin = require('on-build-webpack')
const path = require('path')
const fs = require('fs')
const { exec, spawn } = require('child_process')

const appname = 'dist'
const appPort = 8080
const scriptActive = process.env.BUILD

console.log(scriptActive)

if (scriptActive === 'watch-build') {
  // 开启Wifi服务
  const wifiWorker = spawn(`apicloud wifiStart --port ${appPort}`, {
    shell: true
  })
  wifiWorker.stdout.on('data', function (chunk) {
    console.log(' ' + chunk.toString())
  })
  wifiWorker.on('error', err => {
    console.log('请确保已安装apicloud-cli' + err)
  })
}

module.exports = {
  publicPath: './',
  outputDir: appname,
  filenameHashing: process.env.HASH === 'true',
  lintOnSave: true, // 是否在保存的时候检查
  productionSourceMap: true, // 生产环境是否生成 sourceMap 文件
  css: {
    extract: true, // 是否使用css分离插件 ExtractTextPlugin
    sourceMap: false, // 开启 CSS source maps
    loaderOptions: {}, // css预设器配置项
    modules: false // 启用 CSS modules for all css / pre-processor files.
  },
  configureWebpack: config => {
    config.plugins = config.plugins.concat([
      // 删除build时旧的文件
      new WebpackOnBuildPlugin(function (stats) {
        const newlyCreatedAssets = stats.compilation.assets
        const unlinked = []
        const files = fs.readdirSync(path.resolve(`./${appname}/`))
        if (files.length) {
          // 过滤一下非js文件
          let jsFiles = files.filter(f => /.*(\.js|\.json)$/.test(f))
          jsFiles.forEach(file => {
            if (!newlyCreatedAssets[file]) {
              fs.unlinkSync(path.resolve(`./${appname}/${file}`))
              unlinked.push(file)
            }
          })
          if (unlinked.length > 0) {
            console.log('删除文件: ', unlinked)
          }
          if (scriptActive === 'watch-build') {
            // 编译完成，真机同步。
            exec(
              `apicloud wifiSync --project ./${appname} --updateAll false --port ${appPort}`,
              (error, stdout) => {
                if (error) {
                  console.error(`exec error: ${error}`)
                  console.log(
                    `error: wifi真机同步失败，请确保已安装apicloud-cli或已启动Wifi服务`
                  )
                  return
                }
                console.log(`stderr: ${stdout}wifi真机同步`)
              }
            )
          }
        }
      })
    ])
  },
  devServer: {
    // 环境配置
    host: '0.0.0.0',
    hot: false,
    port: appPort,
    https: false,
    hotOnly: false,
    open: false // 配置自动启动浏览器
  }
}
