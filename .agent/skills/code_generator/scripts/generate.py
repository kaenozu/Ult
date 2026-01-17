#!/usr/bin/env python3
"""
AGStock Ult Code Generator

Reactコンポーネント、APIエンドポイント、テストファイルの自動生成
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

# プロジェクトルートをパスに追加
project_root = Path(__file__).resolve().parent.parent.parent


@dataclass
class ComponentConfig:
    """コンポーネント生成設定"""

    name: str
    type: str
    features: List[str]
    output_dir: str = "src/components"
    include_test: bool = True
    include_storybook: bool = False
    include_types: bool = True


@dataclass
class APIConfig:
    """API生成設定"""

    endpoint: str
    methods: List[str]
    output_dir: str = "backend/src/api"
    include_auth: bool = False
    include_validation: bool = True
    include_docs: bool = True


class CodeGenerator:
    """コード生成エージェント"""

    def __init__(self):
        self.project_root = project_root

    def generate_component(self, config: ComponentConfig) -> Dict[str, str]:
        """Reactコンポーネントを生成"""
        print(f"[GENERATE] Reactコンポーネント {config.name} を作成中...")

        generated_files = {}

        # コンポーネントファイル
        component_content = self._get_component_template(config)
        component_path = f"{config.output_dir}/{config.name}.tsx"
        generated_files[component_path] = component_content

        # タイプ定義ファイル
        if config.include_types:
            types_content = self._get_types_template(config)
            types_path = f"{config.output_dir}/{config.name}.types.ts"
            generated_files[types_path] = types_content

        # テストファイル
        if config.include_test:
            test_content = self._get_test_template(config)
            test_path = f"{config.output_dir}/__tests__/{config.name}.test.tsx"
            generated_files[test_path] = test_content

        # ストーリーブックファイル
        if config.include_storybook:
            story_content = self._get_storybook_template(config)
            story_path = f"{config.output_dir}/{config.name}.stories.tsx"
            generated_files[story_path] = story_content

        return generated_files

    def generate_api(self, config: APIConfig) -> Dict[str, str]:
        """APIエンドポイントを生成"""
        print(f"[GENERATE] APIエンドポイント {config.endpoint} を作成中...")

        generated_files = {}

        for method in config.methods:
            api_content = self._get_api_template(config, method)

            # ファイル名生成
            if method == "CRUD":
                endpoint_file = f"{config.output_dir}/{config.endpoint}.py"
            else:
                endpoint_file = (
                    f"{config.output_dir}/{config.endpoint}_{method.lower()}.py"
                )

            generated_files[endpoint_file] = api_content

        return generated_files

    def _get_component_template(self, config: ComponentConfig) -> str:
        """コンポーネントテンプレート生成"""
        has_realtime = "real-time" in config.features
        has_chart = "chart" in config.features
        has_alerts = "alerts" in config.features

        imports = [
            "import React, { useState, useEffect } from 'react'",
            "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'",
        ]

        if has_chart:
            imports.extend(
                [
                    "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'",
                ]
            )

        if has_alerts:
            imports.extend(
                [
                    "import { Badge } from '@/components/ui/badge'",
                    "import { AlertTriangle, TrendingUp } from 'lucide-react'",
                ]
            )

        imports_str = "\\n".join(imports)

        # リアルタイムデータ用の追加コード
        realtime_data = ""
        realtime_effect = ""
        if has_realtime:
            realtime_data = (
                "\\n  const [realTimeData, setRealTimeData] = useState(data)"
            )
            realtime_effect = """
    // リアルタイム更新
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)"""

        # チャートコンテンツ
        chart_content = ""
        if has_chart:
            chart_content = """
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>"""
        else:
            chart_content = """
        <div className="space-y-4">
          <div className="text-2xl font-bold">
            ¥{data.length > 0 ? data[0].value.toLocaleString() : '0'}
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>"""

        # アラートコンテンツ
        alert_content = ""
        if has_alerts:
            alert_content = """
          <Badge variant="secondary" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Active
          </Badge>"""

        api_endpoint = config.name.lower()

        template_content = f"""{imports_str}

interface {config.name}Props {{
  title?: string
  data?: any[]
}}

export default function {config.name}({{ title = "{config.name}", data = [] }}: {config.name}Props) {{
  const [isLoading, setIsLoading] = useState(true){realtime_data}
  
  useEffect(() => {{
    // データ取得ロジック
    const fetchData = async () => {{
      try {{
        // API呼び出し
        // const response = await fetch('/api/{api_endpoint}')
        // const result = await response.json()
        setIsLoading(false)
      }} catch (error) {{
        console.error('Error fetching data:', error)
        setIsLoading(false)
      }}
    }}
    
    fetchData(){realtime_effect}
  }}, [])
  
  if (isLoading) {{
    return (
      <Card className="w-full h-[300px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </Card>
    )
  }}
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {{title}}{alert_content}
        </CardTitle>
      </CardHeader>
      <CardContent>
{chart_content}
      </CardContent>
    </Card>
  )
}}
"""
        return template_content

    def _get_types_template(self, config: ComponentConfig) -> str:
        """タイプ定義テンプレート"""
        return f"""
// {config.name} タイプ定義

export interface {config.name}Data {{
  id: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}}

export interface {config.name}Props {{
  data?: {config.name}Data[]
  isLoading?: boolean
  error?: string
  onRefresh?: () => void
}}

export interface {config.name}State {{
  data: {config.name}Data[]
  isLoading: boolean
  error: string | null
}}
"""

    def _get_test_template(self, config: ComponentConfig) -> str:
        """テストファイルテンプレート"""
        return f"""
import React from 'react'
import {{ render, screen }} from '@testing-library/react'
import '@testing-library/jest-dom'
import {config.name} from '../{config.name}'

// Mock data
const mockData = [
  {{ id: '1', name: 'Test Item 1', value: 100 }},
  {{ id: '2', name: 'Test Item 2', value: 200 }}
]

describe('{config.name}', () => {{
  it('renders without crashing', () => {{
    render(<{config.name} />)
    expect(screen.getByText('{config.name}')).toBeInTheDocument()
  }})
  
  it('displays data correctly', () => {{
    render(<{config.name} data={{mockData}} />)
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
  }})
  
  it('shows loading state', () => {{
    render(<{config.name} isLoading={{true}} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  }})
  
  it('handles error state', () => {{
    render(<{config.name} error="Test error" />)
    expect(screen.getByText('Test error')).toBeInTheDocument()
  }})
}})
"""

    def _get_storybook_template(self, config: ComponentConfig) -> str:
        """ストーリーブックテンプレート"""
        return f"""
import type {{ Meta, StoryObj }} from '@storybook/react'
import {config.name} from '../{config.name}'

const meta: Meta<typeof {config.name}> = {{
  title: 'Components/{config.name}',
  component: {config.name},
  parameters: {{
    layout: 'centered',
  }},
  tags: ['autodocs'],
}}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {{
  args: {{
    title: '{config.name}',
  }},
}}

export const WithData: Story = {{
  args: {{
    data: [
      {{ id: '1', name: 'Item 1', value: 100 }},
      {{ id: '2', name: 'Item 2', value: 200 }},
    ],
  }},
}}

export const Loading: Story = {{
  args: {{
    isLoading: true,
  }},
}}

export const Error: Story = {{
  args: {{
    error: 'Something went wrong',
  }},
}}
"""

    def _get_api_template(self, config: APIConfig, method: str) -> str:
        """APIテンプレート生成"""
        endpoint_snake = config.endpoint.replace("-", "_")
        endpoint_title = config.endpoint.replace("-", " ").title()

        if method == "GET":
            return f"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/{config.endpoint}", tags=["{config.endpoint}"])

@router.get("/")
async def get_{endpoint_snake}(
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    \"\"\"
    {endpoint_title}一覧取得
    \"\"\"
    try:
        # データベースからデータ取得ロジック
        # data = await get_{endpoint_snake}_from_db(limit, offset)
        
        # モックデータ
        data = [
            {{"id": 1, "name": "Sample 1"}},
            {{"id": 2, "name": "Sample 2"}}
        ]
        
        return {{
            "success": True,
            "data": data,
            "total": len(data)
        }}
        
    except Exception as e:
        logger.error(f"Error fetching {config.endpoint}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{{item_id}}")
async def get_{endpoint_snake}_by_id(item_id: int):
    \"\"\"
    {endpoint_title}詳細取得
    \"\"\"
    try:
        # データベースから詳細取得ロジック
        # data = await get_{endpoint_snake}_by_id_from_db(item_id)
        
        data = {{"id": item_id, "name": "Sample Item"}}
        
        if not data:
            raise HTTPException(status_code=404, detail="{config.endpoint} not found")
            
        return {{
            "success": True,
            "data": data
        }}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching {config.endpoint} {{item_id}}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))
"""
        elif method == "POST":
            return f"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/{config.endpoint}", tags=["{config.endpoint}"])

class {endpoint_snake.title()}Create(BaseModel):
    name: str
    description: Optional[str] = None

@router.post("/")
async def create_{endpoint_snake}(
    item: {endpoint_snake.title()}Create{config.include_auth and ", current_user: dict = Depends(get_current_user)" or ""}
):
    \"\"\"
    {endpoint_title}作成
    \"\"\"
    try:
        # データベース作成ロジック
        # new_item = await create_{endpoint_snake}_in_db(item.dict())
        
        new_item = {{
            "id": 123,
            "name": item.name,
            "description": item.description,
            "created_at": "2026-01-15T10:30:00Z"
        }}
        
        logger.info(f"Created {config.endpoint}: {{new_item['id']}}")
        
        return {{
            "success": True,
            "data": new_item
        }}
        
    except Exception as e:
        logger.error(f"Error creating {config.endpoint}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))
"""
        elif method == "CRUD":
            return f"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/{config.endpoint}", tags=["{config.endpoint}"])

class {endpoint_snake.title()}Create(BaseModel):
    name: str
    description: Optional[str] = None

class {endpoint_snake.title()}Update(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

# GET - 全件取得
@router.get("/")
async def get_{endpoint_snake}(
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    \"\"\"
    {endpoint_title}一覧取得
    \"\"\"
    try:
        data = [
            {{"id": 1, "name": "Sample 1"}},
            {{"id": 2, "name": "Sample 2"}}
        ]
        
        return {{
            "success": True,
            "data": data,
            "total": len(data)
        }}
        
    except Exception as e:
        logger.error(f"Error fetching {config.endpoint}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))

# POST - 作成
@router.post("/")
async def create_{endpoint_snake}(
    item: {endpoint_snake.title()}Create{config.include_auth and ", current_user: dict = Depends(get_current_user)" or ""}
):
    \"\"\"
    {endpoint_title}作成
    \"\"\"
    try:
        new_item = {{
            "id": 123,
            "name": item.name,
            "description": item.description,
            "created_at": "2026-01-15T10:30:00Z"
        }}
        
        logger.info(f"Created {config.endpoint}: {{new_item['id']}}")
        
        return {{
            "success": True,
            "data": new_item
        }}
        
    except Exception as e:
        logger.error(f"Error creating {config.endpoint}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))
"""
        else:
            return f"""
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/{config.endpoint}", tags=["{config.endpoint}"])

@router.{method.lower()}("/")
async def {method.lower()}_{endpoint_snake}():
    \"\"\"
    {method.upper()} {config.endpoint}
    \"\"\"
    try:
        return {{
            "success": True,
            "message": "{method.upper()} operation completed"
        }}
        
    except Exception as e:
        logger.error(f"Error in {method.upper()} {config.endpoint}: {{str(e)}}")
        raise HTTPException(status_code=500, detail=str(e))
"""

    def write_files(self, files: Dict[str, str], dry_run: bool = False) -> bool:
        """生成されたファイルを書き込み"""
        success = True

        for file_path, content in files.items():
            full_path = self.project_root / file_path

            # ディレクトリ作成
            full_path.parent.mkdir(parents=True, exist_ok=True)

            if dry_run:
                print(f"[DRY RUN] Would create: {file_path}")
                continue

            try:
                # 既存ファイルチェック
                if full_path.exists():
                    print(f"[WARNING] File already exists: {file_path}")
                    print(f"  [SKIP] {file_path}")
                    continue

                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"[SUCCESS] Created: {file_path}")

            except Exception as e:
                print(f"[ERROR] Failed to create {file_path}: {e}")
                success = False

        return success


def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="Code Generator Skill")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Component generation
    component_parser = subparsers.add_parser(
        "component", help="Generate React component"
    )
    component_parser.add_argument("--name", required=True, help="Component name")
    component_parser.add_argument(
        "--type",
        choices=["dashboard", "form", "chart", "table", "modal", "layout"],
        default="dashboard",
        help="Component type",
    )
    component_parser.add_argument(
        "--features", nargs="*", default=[], help="Component features"
    )
    component_parser.add_argument(
        "--output-dir", default="src/components", help="Output directory"
    )
    component_parser.add_argument(
        "--no-test", action="store_true", help="Skip test file generation"
    )
    component_parser.add_argument(
        "--storybook", action="store_true", help="Generate Storybook file"
    )
    component_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without creating files",
    )

    # API generation
    api_parser = subparsers.add_parser("api", help="Generate API endpoint")
    api_parser.add_argument("--endpoint", required=True, help="API endpoint name")
    api_parser.add_argument(
        "--methods",
        nargs="+",
        choices=["GET", "POST", "PUT", "DELETE", "CRUD"],
        default=["GET"],
        help="HTTP methods",
    )
    api_parser.add_argument(
        "--output-dir", default="backend/src/api", help="Output directory"
    )
    api_parser.add_argument(
        "--auth", action="store_true", help="Include authentication"
    )
    api_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without creating files",
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    generator = CodeGenerator()

    if args.command == "component":
        config = ComponentConfig(
            name=args.name,
            type=args.type,
            features=args.features,
            output_dir=args.output_dir,
            include_test=not args.no_test,
            include_storybook=args.storybook,
        )

        files = generator.generate_component(config)
        generator.write_files(files, args.dry_run)

    elif args.command == "api":
        config = APIConfig(
            endpoint=args.endpoint,
            methods=args.methods,
            output_dir=args.output_dir,
            include_auth=args.auth,
        )

        files = generator.generate_api(config)
        generator.write_files(files, args.dry_run)


if __name__ == "__main__":
    main()
