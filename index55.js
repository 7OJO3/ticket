const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

// --- ضع روابطك هنا ---
const TICKET_IMAGE = "https://cdn.discordapp.com/attachments/1501300022808023351/1526270984263307325/IMG_9229.jpg?ex=6a566a1f&is=6a55189f&hm=e75b698e5b9c01da1b351707663c3f55fd26b8ea627494e55f07cbcc51e03613&";
const TICKET_THUMBNAIL = "https://cdn.discordapp.com/attachments/1501300022808023351/1526270984263307325/IMG_9229.jpg?ex=6a566a1f&is=6a55189f&hm=e75b698e5b9c01da1b351707663c3f55fd26b8ea627494e55f07cbcc51e03613&";
const CLOSE_IMAGE = "https://cdn.discordapp.com/attachments/1501300022808023351/1526270984263307325/IMG_9229.jpg?ex=6a566a1f&is=6a55189f&hm=e75b698e5b9c01da1b351707663c3f55fd26b8ea627494e55f07cbcc51e03613&";
const ADMIN_ROLE_ID = "1009292040737149018";

client.on('messageCreate', async (message) => {
    if (message.content === '!تكت') {
        const embed = new EmbedBuilder()
            .setTitle("مرحبا بك في قسم الدعم الفني")
            .setDescription("اذا كنت تواجه مشكله,تحتاج الى مساعدة,او ترغب بتقديم بلاغ, افتح تذكره لكن تستعبط بشوتك:")
            .setImage(TICKET_IMAGE)
            .setColor(0x161E31);

        const row1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_complaint')
                .setPlaceholder('شكوى 📩')
                .addOptions([
                    { label: 'شكوى على اداري', description: 'اضغط للشكوى على اداري', value: 'report_admin', emoji: '📩' },
                    { label: 'شكوى على عضو', description: 'اضغط للشكوى على عضو', value: 'report_member', emoji: '📩' }
                ])
        );

        const row2 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_general')
                .setPlaceholder('تذكرة عامة 🎫')
                .addOptions([{ label: 'تذكرة عامة', description: 'تذكرة عامة', value: 'general', emoji: '🎫' }])
        );

        const row3 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_custom')
                .setPlaceholder('مشكلة مخصصة')
                .addOptions([{ label: 'أخرى', description: 'مشكلة أخرى غير موجودة بالقائمة', value: 'custom' }])
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu()) {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: ADMIN_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("تذكرة جديدة")
            .setDescription(`مرحباً ${interaction.user}، انتظر أحد الإداريين لاستلام تذكرتك.`)
            .setThumbnail(TICKET_THUMBNAIL)
            .setImage(TICKET_IMAGE)
            .setColor(0x161E31);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('استلام').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close').setLabel('إغلاق').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${interaction.user} | <@&${ADMIN_ROLE_ID}>`, embeds: [embed], components: [buttons] });
        await interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });
        
        try {
            await interaction.user.send(`تم فتح تذكرتك، الرجاء التوجه إلى الروم: ${channel}`);
        } catch (e) { /* الخاص مغلق */ }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "للإداريين فقط!", ephemeral: true });
            await interaction.reply(`تم استلام التكت بواسطة الإداري ${interaction.user}`);
        }

        if (interaction.customId === 'close') {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "للإداريين فقط!", ephemeral: true });
            const modal = new ModalBuilder().setCustomId('close_modal').setTitle('سبب الإغلاق');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('اكتب سبب الإغلاق').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'close_modal') {
            const reason = interaction.fields.getTextInput('reason');
            
            // استخدام deferReply ليتم قبول الطلب فوراً بدون خطأ "Something went wrong"
            await interaction.deferReply({ ephemeral: true });
            
            try {
                const channel = interaction.channel;
                const memberPermission = channel.permissionOverwrites.cache.find(p => p.type === 1 && p.id !== interaction.guild.id && p.id !== ADMIN_ROLE_ID);
                
                if (memberPermission) {
                    const member = await interaction.guild.members.fetch(memberPermission.id).catch(() => null);
                    
                    if (member) {
                        // إرسال رسالة الإغلاق مع الصور
                        const closeEmbed = new EmbedBuilder()
                            .setTitle("تم إغلاق التذكرة")
                            .setDescription(`تم إغلاق تذكرتك بواسطة الإداري ${interaction.user}\nالسبب: ${reason}`)
                            .setImage(CLOSE_IMAGE)
                            .setThumbnail(TICKET_THUMBNAIL)
                            .setColor(0x161E31);
                            
                        await member.send({ embeds: [closeEmbed] }).catch(() => {});
                    }
                }
            } catch (e) {
                console.error("خطأ:", e);
            }
            
            await interaction.editReply({ content: "تم إغلاق التذكرة بنجاح، سيتم حذف الروم الآن." });
            
            // حذف التذكرة بعد 5 ثوانٍ
            setTimeout(() => {
                if (interaction.channel) interaction.channel.delete().catch(console.error);
            }, 5000);
        }
    }
});

client.login(process.env.TOKEN);
