"""Seed database with default exercises."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise

DEFAULT_EXERCISES = [
    # 胸部
    {"name": "平板杠铃卧推", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "上斜杠铃卧推", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "下斜杠铃卧推", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "平板哑铃卧推", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "上斜哑铃卧推", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "哑铃飞鸟", "category": "chest", "type": "strength", "met_value": 4.0},
    {"name": "龙门架夹胸", "category": "chest", "type": "strength", "met_value": 4.0},
    {"name": "双杠臂屈伸", "category": "chest", "type": "strength", "met_value": 5.0},
    {"name": "蝴蝶机夹胸", "category": "chest", "type": "strength", "met_value": 3.5},
    {"name": "俯卧撑", "category": "chest", "type": "strength", "met_value": 3.8},
    # 背部
    {"name": "杠铃划船", "category": "back", "type": "strength", "met_value": 5.0},
    {"name": "哑铃划船", "category": "back", "type": "strength", "met_value": 4.5},
    {"name": "引体向上", "category": "back", "type": "strength", "met_value": 5.5},
    {"name": "高位下拉", "category": "back", "type": "strength", "met_value": 4.5},
    {"name": "坐姿划船", "category": "back", "type": "strength", "met_value": 4.0},
    {"name": "T杠划船", "category": "back", "type": "strength", "met_value": 5.0},
    {"name": "直臂下压", "category": "back", "type": "strength", "met_value": 3.5},
    {"name": "硬拉", "category": "back", "type": "strength", "met_value": 6.0},
    # 腿部
    {"name": "杠铃深蹲", "category": "legs", "type": "strength", "met_value": 6.0},
    {"name": "前蹲", "category": "legs", "type": "strength", "met_value": 6.0},
    {"name": "腿举", "category": "legs", "type": "strength", "met_value": 5.0},
    {"name": "罗马尼亚硬拉", "category": "legs", "type": "strength", "met_value": 5.5},
    {"name": "腿弯举", "category": "legs", "type": "strength", "met_value": 4.0},
    {"name": "腿屈伸", "category": "legs", "type": "strength", "met_value": 4.0},
    {"name": "箭步蹲", "category": "legs", "type": "strength", "met_value": 5.0},
    {"name": "保加利亚分腿蹲", "category": "legs", "type": "strength", "met_value": 5.0},
    {"name": "小腿提踵", "category": "legs", "type": "strength", "met_value": 3.5},
    # 肩部
    {"name": "杠铃推举", "category": "shoulders", "type": "strength", "met_value": 5.0},
    {"name": "哑铃推举", "category": "shoulders", "type": "strength", "met_value": 4.5},
    {"name": "哑铃侧平举", "category": "shoulders", "type": "strength", "met_value": 3.5},
    {"name": "哑铃前平举", "category": "shoulders", "type": "strength", "met_value": 3.5},
    {"name": "俯身哑铃飞鸟", "category": "shoulders", "type": "strength", "met_value": 3.5},
    {"name": "面拉", "category": "shoulders", "type": "strength", "met_value": 3.5},
    {"name": "阿诺德推举", "category": "shoulders", "type": "strength", "met_value": 4.5},
    # 手臂
    {"name": "杠铃弯举", "category": "arms", "type": "strength", "met_value": 3.5},
    {"name": "哑铃弯举", "category": "arms", "type": "strength", "met_value": 3.5},
    {"name": "锤式弯举", "category": "arms", "type": "strength", "met_value": 3.5},
    {"name": "绳索弯举", "category": "arms", "type": "strength", "met_value": 3.0},
    {"name": "窄距卧推", "category": "arms", "type": "strength", "met_value": 5.0},
    {"name": "绳索下压", "category": "arms", "type": "strength", "met_value": 3.5},
    {"name": "过头臂屈伸", "category": "arms", "type": "strength", "met_value": 3.5},
    {"name": "仰卧臂屈伸", "category": "arms", "type": "strength", "met_value": 3.5},
    # 核心
    {"name": "卷腹", "category": "core", "type": "strength", "met_value": 3.0},
    {"name": "平板支撑", "category": "core", "type": "strength", "met_value": 3.5},
    {"name": "悬垂举腿", "category": "core", "type": "strength", "met_value": 4.0},
    {"name": "俄罗斯转体", "category": "core", "type": "strength", "met_value": 3.5},
    {"name": "腹轮", "category": "core", "type": "strength", "met_value": 4.0},
    # 有氧
    {"name": "跑步机", "category": "cardio", "type": "cardio", "met_value": 8.0},
    {"name": "椭圆机", "category": "cardio", "type": "cardio", "met_value": 7.0},
    {"name": "划船机", "category": "cardio", "type": "cardio", "met_value": 7.0},
    {"name": "动感单车", "category": "cardio", "type": "cardio", "met_value": 8.5},
    {"name": "跳绳", "category": "cardio", "type": "cardio", "met_value": 10.0},
]


async def seed_exercises(db: AsyncSession):
    result = await db.execute(select(Exercise).where(Exercise.is_custom == False).limit(1))
    if result.scalar_one_or_none():
        return  # already seeded

    for ex_data in DEFAULT_EXERCISES:
        db.add(Exercise(**ex_data, is_custom=False))
    await db.commit()
