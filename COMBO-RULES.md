# Kam Do Cafe — Combo & Customization Rules

This document defines how combo customization options are generated in `menu.json`. When adding new menu items, follow these rules to ensure the correct customer choices appear.

## Rule 1: Name contains "/" = customer must choose

| Pattern | Choice | Example |
|---------|--------|---------|
| 雞扒/豬扒 | Choose meat | Chicken or Pork Chop |
| 牛肉/雞扒/豬扒 | Choose meat (3-way) | Beef, Chicken, or Pork |
| 吉列/香煎 | Choose style | Cutlet or Pan Fried |
| 飯/意粉 | Choose base | Rice or Spaghetti |
| 飯/湯米 | Choose base | Rice or Soup Noodle |
| 薯條/沙律 | Choose side | Fries or Salad |

## Rule 2: Section combo accompaniments

| Section | Comes with | Customizations |
|---------|-----------|----------------|
| Noodle Combos (常餐) | Noodle + eggs + toast + hot drink | Choose noodle (5 types, 出前一丁+$0.50), Choose drink (hot free / cold +$1.50) |
| Tomato Soup (蕃茄濃湯) | Tomato soup with noodle + hot drink | Choose noodle in soup, Choose drink |
| Meat Lover (歐陸扒餐) | Eggs + side + hot drink | Choose egg style, Choose side, Upgrade (菠蘿包+$2 / 雪菜肉絲米粉+$2.50 / 迷你火腿通粉+$2.50), Choose drink |
| Nissin Noodles (E區) | Nissin noodle + hot drink | Choose drink, Add-ons (煎蛋+$1.50 / 脆薯餅+$1.50) |
| Rice Plates (C區) | Rice/spaghetti + hot drink | Choose base (rice/spaghetti), Choose drink |
| 200°C Baked (B區) | Rice/spaghetti | Choose base (rice/spaghetti) |
| HK Authentic (F區) | As described | **Only F1** has Upgrade (炒飯+$1.00). F2/F3 (意粉) and F5 (炒一丁) and F8 (炒意粉) do NOT get fried rice upgrade — they bypass section-level with `"customizations": []` |
| Snacks | Standalone | Add drink (optional: 熱飲+$1.50 / 凍飲+$2.50 / 紅豆冰+$3.50). Exception: 紅豆冰 itself skips drink add-on |
| Party Tray (Baked) | Large tray | Choose base (焗飯/意粉), Choose sauce (蕃茄/咖喱/白/菌/芝士) |

## Rule 3: Item-level overrides section-level

Add a `customizations` array directly on the item in `menu.json` when it needs choices beyond the section default. The code checks `item.customizations || subsection.customizations || section.customizations`.

## Rule 4: Bypass section customizations

Set `"customizations": []` (empty array) on an item to make it go directly to cart, skipping any section/subsection-level customizations. Use this when a section has customizations but a specific item shouldn't (e.g. 紅豆冰 in the Snacks section, F2/F3 in HK Authentic).

## Rule 5: Customization schema

```json
{
  "label_en": "Choose meat",
  "label_zh": "選擇肉類",
  "type": "radio",       // "radio" = pick one, "checkbox" = multi-select
  "required": true,       // true = must select, false = optional
  "options": [
    { "name_en": "Chicken", "name_zh": "雞扒", "price": 0 },
    { "name_en": "Pork Chop", "name_zh": "豬扒", "price": 0 }
  ]
}
```

## Rule 6: Multi-select (checkbox) for pick-2 combos

Use `"type": "checkbox"` when customers can pick more than one option:
- **A9 任選一款**: checkbox for meat (pick 1 or 2, Cheese Sausage +$0.50)
- **A6 孖寶雙拼**: checkbox for meats (pick 2 from 午餐肉/芝士腸/火腿)
- **E區 Add-ons**: checkbox for 煎蛋/脆薯餅 (pick any)

## Rule 7: Adding a new item checklist

1. Check if name has "/" → add radio choice for the "/" options
2. Identify which section → apply that section's standard accompaniment choices
3. If item needs extra choices → add item-level `customizations` array
4. If item only needs section standard → no item-level customizations needed (inherits)
5. If item should NOT inherit section customizations → set `"customizations": []`
6. If item allows picking multiple → use `"type": "checkbox"` instead of `"radio"`

## Pricing add-ons reference

| Add-on | Price | Where |
|--------|-------|-------|
| 凍飲 (Cold drink) | +$1.50 | All combo sections |
| 出前一丁 (Instant noodle) | +$0.50 | Noodle combos, Tomato soup |
| 轉炒飯底 (Fried rice) | +$1.00 | F1 only |
| 轉菠蘿包 | +$2.00 | Meat Lover combo |
| 雪菜肉絲米粉 | +$2.50 | Meat Lover combo |
| 迷你火腿通粉 | +$2.50 | Meat Lover combo |
| 加煎蛋 | +$1.50 | Nissin noodles (E區) |
| 加脆薯餅 | +$1.50 | Nissin noodles (E區) |
| 熱飲 | +$1.50 | Snacks |
| 凍飲 | +$2.50 | Snacks |
| 紅豆冰 | +$3.50 | Snacks |

## Sauce library (醬汁庫)

黑椒汁, 咖哩汁, 洋蔥汁, 瑞士汁, 肉醬, 芝士忌廉汁, 白汁, 蔥油, 蕃茄汁, 菌汁
