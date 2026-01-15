"""
学習データ品質向上のための前処理モジュール

- 異常値検出と除去
- 欠損値処理の改善
- データリーク防止
- 時系列データの拡張
- 標準化/正規化
- ウォークフォワード検証の実装
"""

import logging
import warnings
from typing import List, Tuple

import numpy as np
import pandas as pd
import scipy.stats as stats
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


def detect_outliers_isolation_forest(df: pd.DataFrame, cols: List[str], contamination: float = 0.1) -> pd.Series:
    """
    Isolation Forestを用いた異常値検出

    Args:
        df: データフレーム
        cols: 異常値検出対象のカラム
        contamination: 異常値の割合

    Returns:
        異常値フラグ (True: 異常)
    """
    iso_forest = IsolationForest(contamination=contamination, random_state=42)
    X = df[cols].values
    outlier_labels = iso_forest.fit_predict(X)

    # -1が異常値、1が正常値
    return outlier_labels == -1


def detect_outliers_statistical(df: pd.DataFrame, cols: List[str], z_threshold: float = 3.0) -> pd.DataFrame:
    """
    統計的アプローチによる異常値検出（Zスコアベース）

    Args:
        df: データフレーム
        cols: 対象カラム
        z_threshold: Zスコアの閾値

    Returns:
        各カラムごとの異常値フラグ
    """
    outlier_flags = pd.DataFrame(index=df.index)

    for col in cols:
        if col not in df.columns:
            continue

        z_scores = np.abs(stats.zscore(df[col].dropna()))
        outlier_flags[f"{col}_outlier"] = np.abs(z_scores) > z_threshold

    return outlier_flags


def detect_outliers_modified_zscore(df: pd.DataFrame, cols: List[str], threshold: float = 3.5) -> pd.DataFrame:
    """
    修正Zスコアによる異常値検出（中央値ベース）

    Args:
        df: データフレーム
        cols: 対象カラム
        threshold: 閾値

    Returns:
        各カラムごとの異常値フラグ
    """
    outlier_flags = pd.DataFrame(index=df.index)

    for col in cols:
        if col not in df.columns:
            continue

        median = df[col].median()
        mad = np.median(np.abs(df[col] - median))
        modified_z_score = 0.6745 * (df[col] - median) / mad
        outlier_flags[f"{col}_modified_z_outlier"] = np.abs(modified_z_score) > threshold

    return outlier_flags


def remove_outliers(df: pd.DataFrame, outlier_cols: List[str], method: str = "drop") -> pd.DataFrame:
    """
    異常値の除去

    Args:
        df: データフレーム
        outlier_cols: 異常値フラグカラム
        method: 処理方法 ('drop', 'cap', 'interpolate')

    Returns:
        異常値処理後のデータフレーム
    """
    df_out = df.copy()

    # 全体の異常値フラグをマージ
    any_outlier = pd.Series([False] * len(df_out), index=df_out.index)
    for col in outlier_cols:
        if col in df_out.columns:
            any_outlier |= df_out[col]

    if method == "drop":
        # 異常値の行を削除
        df_out = df_out[~any_outlier]
    elif method == "cap":
        # 異常値をキャップ（上下1%点に）
        for col in df.columns:
            if col in ["Date", "datetime"] or df[col].dtype == "object":
                continue
            q1, q99 = df_out[col].quantile([0.01, 0.99])
            df_out[col] = df_out[col].clip(lower=q1, upper=q99)
    elif method == "interpolate":
        # 異常値部分を補完
        mask = any_outlier
        # 数値カラムのみを補正
        numeric_cols = df_out.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df_out[col].dtype == "datetime64[ns]":
                continue
            df_out.loc[mask, col] = np.nan

        # 数値カラムのみ補間を実行
        df_out[numeric_cols] = df_out[numeric_cols].interpolate(method="linear")

    return df_out


def advanced_missing_value_handling(df: pd.DataFrame) -> pd.DataFrame:
    """
    欠損値処理の改善

    Args:
        df: データフレーム

    Returns:
        欠損値処理後のデータフレーム
    """
    df_out = df.copy()

    for col in df_out.columns:
        if df_out[col].isnull().any():
            # 数値カラムの場合
            if df_out[col].dtype in ["int64", "float64"]:
                # OHLCVデータの場合は、特別な補完方法を適用
                if col in ["Open", "High", "Low", "Close"]:
                    # 前の値で補完（前日終値を当日始値に、など）
                    df_out[col] = df_out[col].fillna(method="ffill").fillna(method="bfill")
                elif col == "Volume":
                    # 出来高は0で補完（取引がなかったとみなす）
                    df_out[col] = df_out[col].fillna(0)
                else:
                    # その他の数値は線形補完
                    df_out[col] = df_out[col].interpolate(method="linear")
            # カテゴリカルカラムの場合
            elif df_out[col].dtype == "object":
                # 最頻値で補完
                mode_val = df_out[col].mode()
                if len(mode_val) > 0:
                    df_out[col] = df_out[col].fillna(mode_val[0])
                else:
                    df_out[col] = df_out[col].fillna("Unknown")
            # 日付カラムの場合
            elif df_out[col].dtype == "datetime64[ns]":
                # 前の日付で補完
                df_out[col] = df_out[col].fillna(method="ffill")

    return df_out


def prevent_data_leakage(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    データリーク防止

    Args:
        df: データフレーム

    Returns:
        データリーク防止後のデータフレームとリークカラムリスト
    """
    df_out = df.copy()
    leaked_cols = []

    # ターゲット変数に基づくリークを検出
    target_cols = [col for col in df_out.columns if "Target" in col or "Return" in col or "Future" in col]

    for col in df_out.columns:
        if col in target_cols:
            continue
        # ターゲット変数との相関を計算（高すぎる場合はリークの可能性）
        for target_col in target_cols:
            if target_col in df_out.columns:
                correlation = df_out[col].corr(df_out[target_col])
                if abs(correlation) > 0.95:  # 閾値は調整可能
                    logger.warning(
                        f"Possible data leakage detected: {col} with {target_col}, correlation: {correlation:.4f}"
                    )
                    leaked_cols.append(col)
                    # 問題のあるカラムを削除
                    df_out = df_out.drop(columns=[col])

    # 日付ベースのリークをチェック（未来の情報）
    if "Date" in df_out.columns:
        df_out["Date"] = pd.to_datetime(df_out["Date"])
        # 日付の重複や異常な日付を検出
        if df_out["Date"].duplicated().any():
            df_out = df_out.drop_duplicates(subset=["Date"])

    return df_out, leaked_cols


class TimeSeriesScaler:
    """時系列データ向けのスケーラー"""

    def __init__(self, method: str = "standard"):
        self.method = method
        self.scalers = {}
        self.fitted = False

    def fit(self, df: pd.DataFrame, cols: List[str]) -> "TimeSeriesScaler":
        """スケーラーの学習"""
        for col in cols:
            if self.method == "standard":
                scaler = StandardScaler()
            elif self.method == "minmax":
                scaler = MinMaxScaler()
            elif self.method == "robust":
                scaler = RobustScaler()
            else:
                raise ValueError(f"Unknown scaling method: {self.method}")

            # 欠損値を除いて学習
            valid_data = df[col].dropna().values.reshape(-1, 1)
            if len(valid_data) > 0:
                scaler.fit(valid_data)
                self.scalers[col] = scaler

        self.fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """変換の適用"""
        if not self.fitted:
            raise ValueError("Scaler has not been fitted yet.")

        df_out = df.copy()

        for col, scaler in self.scalers.items():
            if col in df_out.columns:
                # 欠損値部分を保持しつつ変換
                mask = df_out[col].notna()
                if mask.any():
                    valid_data = df_out.loc[mask, col].values.reshape(-1, 1)
                    transformed_data = scaler.transform(valid_data)
                    df_out.loc[mask, col] = transformed_data.flatten()

        return df_out

    def fit_transform(self, df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
        """学習と変換を一度に行う"""
        return self.fit(df, cols).transform(df)


def augment_time_series_data(df: pd.DataFrame, noise_factor: float = 0.01) -> pd.DataFrame:
    """
    時系列データの拡張

    Args:
        df: 元のデータフレーム
        noise_factor: ノイズの強さ

    Returns:
        拡張されたデータフレーム
    """
    # 元のデータに少しだけノイズを加えたデータを追加
    df_augmented = df.copy()

    # 数値カラムにノイズを追加
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if col not in ["Date", "datetime"]:
            noise = np.random.normal(0, df[col].std() * noise_factor, size=len(df))
            df_augmented[f"{col}_augmented"] = df[col] + noise

    # 元のデータと拡張されたデータを結合
    df_combined = pd.concat([df, df_augmented], ignore_index=True)

    return df_combined


def implement_walk_forward_validation(df: pd.DataFrame, n_splits: int = 5) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
    """
    ウォークフォワード検証の実装

    Args:
        df: 時系列データ
        n_splits: 分割数

    Returns:
        トレーニング/テストのデータ分割のリスト
    """
    if not isinstance(df.index, pd.DatetimeIndex):
        # 日付インデックスでない場合は作成
        if "Date" in df.columns:
            df = df.set_index(pd.to_datetime(df["Date"]))
        else:
            raise ValueError("DataFrame must have a Date column or DatetimeIndex for walk-forward validation")

    # 時系列分割
    tscv = TimeSeriesSplit(n_splits=n_splits)
    splits = []

    # 添え字の取得
    indices = list(tscv.split(df))

    for train_idx, test_idx in indices:
        train_data = df.iloc[train_idx]
        test_data = df.iloc[test_idx]
        splits.append((train_data, test_data))

    return splits


def apply_target_encoding_with_cv(
    df: pd.DataFrame, target_col: str, categorical_cols: List[str], cv_folds: int = 5
) -> pd.DataFrame:
    """
    クロスバリデーションベースのターゲットエンコーデング

    Args:
        df: データフレーム
        target_col: 目的変数
        categorical_cols: カテゴリカル変数
        cv_folds: CVの分割数

    Returns:
        ターゲットエンコーディング適用後のデータフレーム
    """
    df_out = df.copy()

    for col in categorical_cols:
        if col not in df_out.columns:
            continue

        # カテゴリごとの平均計算
        df_out.groupby(col)[target_col].mean()

        # クロスバリデーションでリーク防止
        tscv = TimeSeriesSplit(n_splits=cv_folds)

        for train_idx, test_idx in tscv.split(df_out):
            # 学習データのカテゴリ平均を計算
            train_cats = df_out.iloc[train_idx]
            train_means = train_cats.groupby(col)[target_col].mean()

            # テストデータにエンコーディングを適用（学習データの平均を使用）
            test_data = df_out.iloc[test_idx]
            encoded_values = test_data[col].map(train_means)

            # マッピングされなかった値（学習データにないカテゴリ）は全体平均で埋める
            overall_mean = df_out[target_col].mean()
            encoded_values = encoded_values.fillna(overall_mean)

            # 元のDataFrameに反映
            df_out.loc[test_idx, f"{col}_encoded"] = encoded_values

    return df_out


def preprocess_for_prediction(df: pd.DataFrame, target_col: str = "Close") -> Tuple[pd.DataFrame, TimeSeriesScaler]:
    """
    予測用のデータ前処理

    Args:
        df: 生データ
        target_col: ターゲットカラム

    Returns:
        前処理後のデータフレームとスケーラー
    """
    df_out = df.copy()

    # 1. 欠損値処理
    df_out = advanced_missing_value_handling(df_out)

    # 1.5. カテゴリカル変数の数値化 (最優先で実行)
    print("DEBUG: ENTERING preprocess_for_prediction")
    for col in df_out.columns:
        if df_out[col].dtype.name in ["object", "category", "string"]:
            print(f"DEBUG: Feature '{col}' is {df_out[col].dtype}. Converting...")
            if df_out[col].dtype.name == "category":
                df_out[col] = df_out[col].cat.codes
            else:
                # まず数値変換を試みる
                try:
                    df_out[col] = pd.to_numeric(df_out[col])
                except (ValueError, TypeError):
                    # 失敗したらfactorize
                    df_out[col] = pd.factorize(df_out[col])[0]

    # 2. 異常値検出（統計的アプローチ）
    print("DEBUG: ENTERING preprocess_for_prediction")
    print(f"DEBUG: df shape: {df_out.shape}")
    print(f"DEBUG: dtypes head: {df_out.dtypes.head()}")
    columns_with_low = []
    for col in df_out.columns:
        if df_out[col].dtype == "object" or df_out[col].dtype.name == "category":
            print(f"DEBUG: Found non-numeric col: {col} ({df_out[col].dtype})")
            if "Cat" in col:
                # Check for 'Low'
                if df_out[col].astype(str).str.contains("Low").any():
                    columns_with_low.append(col)
    print(f"DEBUG: Columns containing 'Low': {columns_with_low}")

    numeric_cols = df_out.select_dtypes(include=[np.number]).columns.tolist()
    if target_col in numeric_cols:
        numeric_cols.remove(target_col)

    outlier_flags = detect_outliers_statistical(df_out, numeric_cols[:5])  # 最初の5カラムだけ処理
    outlier_cols = [col for col in outlier_flags.columns if col.endswith("_outlier")]
    df_out = remove_outliers(df_out, outlier_cols, method="interpolate")

    # 3. データリーク防止
    df_out, leaked_cols = prevent_data_leakage(df_out)

    # 4. 標準化/正規化
    # 数値カラムを再取得
    numeric_cols = df_out.select_dtypes(include=[np.number]).columns.tolist()
    if target_col in numeric_cols:
        numeric_cols.remove(target_col)

    scaler_cols = [col for col in df_out.columns if col in numeric_cols and col not in leaked_cols]
    scaler = TimeSeriesScaler(method="robust")
    df_out = scaler.fit_transform(df_out, scaler_cols)

    # 5. 日付ベースの特徴量が欠けている場合は補完
    if not isinstance(df_out.index, pd.DatetimeIndex):
        if "Date" in df_out.columns:
            df_out["Date"] = pd.to_datetime(df_out["Date"])
            df_out = df_out.set_index("Date")
        else:
            logger.warning("Date column not found, using default index")

    logger.info(f"Preprocessing completed. Shape: {df_out.shape}, Removed leaked columns: {leaked_cols}")

    return df_out, scaler


def prepare_ml_dataset(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    sequence_length: int,
    forecast_horizon: int = 1,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    機械学習用のデータセットを準備

    Args:
        df: 前処理済みデータ
        feature_cols: 特徴量カラム
        target_col: ターゲットカラム
        sequence_length: シーケンス長
        forecast_horizon: 予測期間

    Returns:
        X (特徴量), y (ターゲット)
    """
    # 特徴量行列
    X_data = df[feature_cols].values
    # ターゲット行列
    y_data = df[target_col].values

    X, y = [], []
    for i in range(sequence_length, len(X_data) - forecast_horizon + 1):
        X.append(X_data[i - sequence_length : i])
        y.append(y_data[i + forecast_horizon - 1])  # 1ステップ先予測

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


if __name__ == "__main__":
    # テスト用の実装
    logging.basicConfig(level=logging.INFO)

    # ダミーデータの作成
    dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
    dummy_data = pd.DataFrame(
        {
            "Date": dates,
            "Open": np.random.randn(200).cumsum() + 100,
            "High": np.random.randn(200).cumsum() + 101,
            "Low": np.random.randn(200).cumsum() + 99,
            "Close": np.random.randn(200).cumsum() + 100,
            "Volume": np.random.randint(1000000, 5000000, 200),
            "RSI": np.random.uniform(0, 100, 200),
            "MACD": np.random.randn(200),
        }
    )

    # いくつかの外れ値を追加
    dummy_data.loc[50, "Close"] = dummy_data.loc[49, "Close"] * 5  # 5倍の価格変動
    dummy_data.loc[100, "Volume"] = 100000000  # 非常に大きな出来高

    print(f"Original data shape: {dummy_data.shape}")
    print(f"Original data with outliers:\n{dummy_data[['Close', 'Volume']].iloc[[49, 50, 51, 99, 100, 101]]}")

    # 前処理の実行
    processed_data, scaler = preprocess_for_prediction(dummy_data)

    print(f"\nProcessed data shape: {processed_data.shape}")
    print(f"Processed data:\n{processed_data[['Close', 'Volume']].iloc[[49, 50, 51, 99, 100, 101]]}")

    # ウォークフォワード検証のテスト
    splits = implement_walk_forward_validation(processed_data.set_index("Date"), n_splits=3)
    print(f"\nWalk-forward validation created {len(splits)} splits")
    for i, (train, test) in enumerate(splits):
        print(
            f"Split {i + 1}: Train from {train.index[0]} to {train.index[-1]} ({len(train)} samples), "
            f"Test from {test.index[0]} to {test.index[-1]} ({len(test)} samples)"
        )

    # 機械学習データ準備のテスト
    feature_cols = ["Open", "High", "Low", "Close", "Volume", "RSI", "MACD"]
    X, y = prepare_ml_dataset(
        processed_data,
        feature_cols=feature_cols,
        target_col="Close",
        sequence_length=10,
        forecast_horizon=1,
    )

    print(f"\nML dataset prepared: X shape {X.shape}, y shape {y.shape}")

    # 異常値検出のテスト
    outlier_flags = detect_outliers_statistical(dummy_data, ["Close", "Volume"])
    print(f"\nOutlier flags:\n{outlier_flags.head(10)}")

    # ターゲットエンコーディングのテスト
    dummy_data["Category"] = np.random.choice(["A", "B", "C"], size=len(dummy_data))
    encoded_data = apply_target_encoding_with_cv(dummy_data, "Close", ["Category"], cv_folds=3)
    print(f"\nTarget encoded columns: {[col for col in encoded_data.columns if 'encoded' in col]}")
