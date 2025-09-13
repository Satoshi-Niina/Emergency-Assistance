// bcryptjsがインストールされていない場合の代替手段
// オンラインツール: https://bcrypt-generator.com/ を使用してハッシュを生成

// パスワードとユーザー情報
const users = [
    { username: 'niina', password: 'G&896845', display_name: '新納 智志', role: 'admin', department: 'システム管理部', description: 'システム管理者' },
    { username: 'takabeni1', password: 'Takabeni&1', display_name: 'タカベニ1', role: 'admin', department: 'システム管理部', description: '運用管理者' },
    { username: 'takabeni2', password: 'Takaben&2', display_name: 'タカベニ2', role: 'employee', department: '保守部', description: '一般ユーザー' }
];

async function generateHashes() {
    console.log('🔐 パスワードハッシュを生成中...\n');
    
    for (const user of users) {
        const saltRounds = 10;
        const hash = await bcrypt.hash(user.password, saltRounds);
        
        console.log(`-- ${user.display_name} (${user.username})`);
        console.log(`INSERT INTO users (username, password, display_name, role, department, description) VALUES`);
        console.log(`    ('${user.username}', '${hash}', '${user.display_name}', '${user.role}', '${user.department}', '${user.description}');`);
        console.log('');
    }
    
    console.log('✅ ハッシュ生成完了');
}

generateHashes().catch(console.error);
