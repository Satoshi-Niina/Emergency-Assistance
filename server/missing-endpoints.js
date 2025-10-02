// 不足しているエンドポイントを追加
// ユーザー管理エンドポイント（POST, PUT, DELETE）

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, display_name, role, department, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbPool.query(
      'INSERT INTO users (username, password, display_name, role, department, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, display_name, role, department',
      [username, hashedPassword, display_name, role, department, description]
    );

    res.json({
      success: true,
      user: result.rows[0],
      message: 'ユーザーを作成しました'
    });
  } catch (error) {
    console.error('[api/users] POST error:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー作成に失敗しました'
    });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, display_name, role, department, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    let query = 'UPDATE users SET username = $1, display_name = $2, role = $3, department = $4, description = $5';
    let params = [username, display_name, role, department, description];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = $6';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, username, display_name, role, department';
    params.push(id);

    const result = await dbPool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: 'ユーザーを更新しました'
    });
  } catch (error) {
    console.error('[api/users] PUT error:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー更新に失敗しました'
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'ユーザーを削除しました'
    });
  } catch (error) {
    console.error('[api/users] DELETE error:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー削除に失敗しました'
    });
  }
});

// 機種管理エンドポイント（POST, PUT, DELETE）

app.post('/api/machines/machine-types', async (req, res) => {
  try {
    const { machine_type_name, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query(
      'INSERT INTO machine_types (machine_type_name, description) VALUES ($1, $2) RETURNING id, machine_type_name, description',
      [machine_type_name, description]
    );

    res.json({
      success: true,
      machineType: result.rows[0],
      message: '機種を作成しました'
    });
  } catch (error) {
    console.error('[api/machines/machine-types] POST error:', error);
    res.status(500).json({
      success: false,
      message: '機種作成に失敗しました'
    });
  }
});

app.put('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_type_name, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query(
      'UPDATE machine_types SET machine_type_name = $1, description = $2 WHERE id = $3 RETURNING id, machine_type_name, description',
      [machine_type_name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '機種が見つかりません'
      });
    }

    res.json({
      success: true,
      machineType: result.rows[0],
      message: '機種を更新しました'
    });
  } catch (error) {
    console.error('[api/machines/machine-types] PUT error:', error);
    res.status(500).json({
      success: false,
      message: '機種更新に失敗しました'
    });
  }
});

app.delete('/api/machines/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query('DELETE FROM machine_types WHERE id = $1 RETURNING machine_type_name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '機種が見つかりません'
      });
    }

    res.json({
      success: true,
      message: '機種を削除しました'
    });
  } catch (error) {
    console.error('[api/machines/machine-types] DELETE error:', error);
    res.status(500).json({
      success: false,
      message: '機種削除に失敗しました'
    });
  }
});

// 機械管理エンドポイント（POST, PUT, DELETE）

app.post('/api/machines/machines', async (req, res) => {
  try {
    const { machine_number, machine_type_id, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query(
      'INSERT INTO machines (machine_number, machine_type_id, description) VALUES ($1, $2, $3) RETURNING id, machine_number, machine_type_id, description',
      [machine_number, machine_type_id, description]
    );

    res.json({
      success: true,
      machine: result.rows[0],
      message: '機械を作成しました'
    });
  } catch (error) {
    console.error('[api/machines/machines] POST error:', error);
    res.status(500).json({
      success: false,
      message: '機械作成に失敗しました'
    });
  }
});

app.put('/api/machines/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_number, machine_type_id, description } = req.body;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query(
      'UPDATE machines SET machine_number = $1, machine_type_id = $2, description = $3 WHERE id = $4 RETURNING id, machine_number, machine_type_id, description',
      [machine_number, machine_type_id, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '機械が見つかりません'
      });
    }

    res.json({
      success: true,
      machine: result.rows[0],
      message: '機械を更新しました'
    });
  } catch (error) {
    console.error('[api/machines/machines] PUT error:', error);
    res.status(500).json({
      success: false,
      message: '機械更新に失敗しました'
    });
  }
});

app.delete('/api/machines/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '管理者権限が必要です'
      });
    }

    if (!dbPool) {
      return res.status(500).json({
        success: false,
        message: 'データベース接続が利用できません'
      });
    }

    const result = await dbPool.query('DELETE FROM machines WHERE id = $1 RETURNING machine_number', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '機械が見つかりません'
      });
    }

    res.json({
      success: true,
      message: '機械を削除しました'
    });
  } catch (error) {
    console.error('[api/machines/machines] DELETE error:', error);
    res.status(500).json({
      success: false,
      message: '機械削除に失敗しました'
    });
  }
});
