import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import { PairIcon } from "src/components/TokenIcon/TokenIcon";
import { poolRows } from "./mock";

// 流動性池列表 - shared by the liquidity main board and the pool list board.

function PoolTable() {
    return (
        <div className="gp-table-wrap">
            <table className="gp-table">
                <thead>
                    <tr>
                        <th>{t`交易對`}</th>
                        <th>{t`池子價值 (USD)`}</th>
                        <th>{t`24h 交易量 (USD)`}</th>
                        <th>{t`年化收益 (參考)`}</th>
                        <th>{t`流動性佔比`}</th>
                        <th>{t`操作`}</th>
                    </tr>
                </thead>
                <tbody>
                    {poolRows().map(row => (
                        <tr key={`${row.a}-${row.b}`}>
                            <td>
                                <div className="gp-row">
                                    <PairIcon a={row.a} b={row.b} />
                                    <span className="gp-strong">
                                        {row.a} / {row.b}
                                    </span>
                                </div>
                            </td>
                            <td>{row.value}</td>
                            <td>{row.volume}</td>
                            <td>{row.apr}</td>
                            <td>{row.share}</td>
                            <td>
                                <Link className="gp-btn gp-btn-outline gp-btn-sm" to="/liquidity/add">
                                    {t`管理`}
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PoolTable;
