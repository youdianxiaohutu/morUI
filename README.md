# AAA 游戏聊天

## 项目结构
- `chat.html` - 聊天界面
- `game.html` - 游戏界面
- `login.html` - 登录界面
- `settings.html` - 设置界面
- `ztk/` - 游戏数据
  - `self/` - 角色状态
  - `others/` - 其他角色
  - `wd/` - 悟道系统
- `xx/` - 选项配置
- `saves/` - 存档目录（后端使用）

## 启动方式

### 1. 启动后端服务器
```bash
cd C:\Users\Administrator\Desktop\aaa
npm install
npm start
```

### 2. 启动 Live Server
打开 `chat.html`，使用 Live Server 运行

## 存档功能
- 存档：点击导航栏 "存档/读档" -> 选择存档位置 -> 自动保存到服务器
- 读档：点击导航栏 "存档/读档" -> 选择读档位置 -> 从服务器加载
- 存档位置：c1 ~ c5

## API 接口
- POST /api/save/:slot - 保存存档
- GET /api/load/:slot - 加载存档
- GET /api/saves - 获取存档列表
- DELETE /api/save/:slot - 删除存档
