/**
 * 自定义模态框组件 - 独立于酒馆 UI，确保样式与交互一致
 */
export const Modal = {
    /**
     * 显示数据编辑/新增模态框
     * @param {string} title 标题
     * @param {Array} fields 字段定义
     * @param {Object} data 初始数据（编辑模式）
     * @param {Function} onSave 保存回调
     */
    show(title, fields, data, onSave) {
        // 移除旧的（如果存在）
        $('.st-modal-overlay').remove();

        const isEdit = !!data;
        const modalHtml = `
            <div class="st-modal-overlay" style="
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
                display: flex; align-items: center; justify-content: center;
                z-index: 10005; animation: fadeIn 0.2s ease-out;
            ">
                <div class="st-modal-content" style="
                    width: 450px; background: #15151e; border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px; padding: 40px; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                    transform: scale(0.95); animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                ">
                    <h3 style="margin: 0 0 10px 0; font-weight: 300; color: #fff;">${title}</h3>
                    <p style="color: #666; font-size: 0.85em; margin-bottom: 30px;">
                        ${isEdit ? '修改现有统计数据' : '手动添加一条新的记录'}
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 20px; max-height: 400px; overflow-y: auto; padding-right: 10px;" class="st-custom-scrollbar">
                        ${fields.map(f => `
                            <div>
                                <label style="display: block; font-size: 0.75em; color: #5588ff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${f.name}</label>
                                <input type="text" class="st-modal-input" data-key="${f.key}" value="${data ? (data[f.key] || '') : ''}" 
                                    style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 8px; font-size: 0.9em; outline: none; transition: 0.3s;"
                                    onfocus="this.style.borderColor='#5588ff'; this.style.boxShadow='0 0 0 2px rgba(85,136,255,0.2)'"
                                    onblur="this.style.borderColor='#333'; this.style.boxShadow='none'">
                            </div>
                        `).join('')}
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 15px; margin-top: 40px;">
                        <button id="st-modal-cancel" style="background: transparent; color: #888; border: none; padding: 10px 20px; cursor: pointer; font-size: 0.9em;">取消</button>
                        <button id="st-modal-confirm" style="background: #5588ff; color: #fff; border: none; padding: 12px 30px; border-radius: 10px; cursor: pointer; font-weight: 600; box-shadow: 0 10px 20px rgba(85,136,255,0.2);">
                            确认保存
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 插入到插件主面板内部
        $('#smart-table-floating-panel').append(modalHtml);

        // 绑定事件
        $('#st-modal-cancel').on('click', () => $('.st-modal-overlay').remove());
        
        $('#st-modal-confirm').on('click', () => {
            const result = {};
            $('.st-modal-input').each(function() {
                result[$(this).data('key')] = $(this).val().trim();
            });
            onSave(result);
            $('.st-modal-overlay').remove();
            toastr.success('保存成功');
        });

        // 点击背景关闭
        $('.st-modal-overlay').on('click', function(e) {
            if (e.target === this) $(this).remove();
        });
    }
};
