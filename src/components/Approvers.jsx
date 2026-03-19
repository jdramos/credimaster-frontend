import React, { useState } from 'react';
import BranchSelect from './components/BranchSelect';
import ApproverList from './ApproverList';
import AddApproverForm from './components/AddApproverForm';

function Approvers() {
    const [branchId, setBranchId] = useState(null);

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Loan Approvers Manager</h1>
            <BranchSelect onSelect={setBranchId} />
            {branchId && (
                <>
                    <ApproverList branchId={branchId} />
                    <AddApproverForm branchId={branchId} />
                </>
            )}
        </div>
    );
}

export default Approvers;
